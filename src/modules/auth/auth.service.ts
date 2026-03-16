import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createHash } from 'crypto';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { UserRole } from '@prisma/client';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RequestUser } from './jwt.strategy';

const SALT_ROUNDS = 12;
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // seconds
}

export interface AuthUserResponse {
  id: string;
  email: string;
  role: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUserResponse;
  expiresIn?: number;
}

function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  private getRefreshSecret(): string {
    return (
      this.config.get<string>('JWT_REFRESH_SECRET') ||
      this.config.get<string>('JWT_SECRET')!
    );
  }

  private async createTokenPair(
    userId: string,
    email: string,
    role: UserRole,
  ): Promise<{ pair: TokenPair; refreshTokenId: string }> {
    const payload = {
      sub: userId,
      email,
      role: role as string,
    };
    const accessToken = this.jwt.sign(payload, {
      secret: this.config.get<string>('JWT_SECRET'),
      expiresIn: ACCESS_TOKEN_EXPIRY,
    });
    const refreshToken = this.jwt.sign(
      { ...payload, type: 'refresh' },
      {
        secret: this.getRefreshSecret(),
        expiresIn: REFRESH_TOKEN_EXPIRY,
      },
    );
    const expiresIn = 15 * 60; // 15 minutes in seconds
    const pair: TokenPair = {
      accessToken,
      refreshToken,
      expiresIn,
    };
    const refreshTokenId = this.jwt.decode(refreshToken) as { jti?: string };
    return {
      pair,
      refreshTokenId: (refreshTokenId?.jti as string) || hashRefreshToken(refreshToken).slice(0, 36),
    };
  }

  private async saveRefreshToken(
    userId: string,
    refreshToken: string,
  ): Promise<void> {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: hashRefreshToken(refreshToken),
        expiresAt,
      },
    });
  }

  async register(dto: RegisterDto): Promise<AuthResponse> {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase(), deletedAt: null },
    });
    if (existing) {
      throw new ConflictException({
        success: false,
        error: {
          message: 'User with this email already exists',
          code: 'EMAIL_ALREADY_EXISTS',
        },
      });
    }
    const hashedPassword = await bcrypt.hash(dto.password, SALT_ROUNDS);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        password: hashedPassword,
        role: UserRole.STAFF,
      },
    });
    const { pair } = await this.createTokenPair(
      user.id,
      user.email,
      user.role,
    );
    await this.saveRefreshToken(user.id, pair.refreshToken);
    return {
      accessToken: pair.accessToken,
      refreshToken: pair.refreshToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      expiresIn: pair.expiresIn,
    };
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase(), deletedAt: null },
    });
    if (!user) {
      throw new UnauthorizedException({
        success: false,
        error: {
          message: 'Invalid email or password',
          code: 'INVALID_CREDENTIALS',
        },
      });
    }
    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) {
      throw new UnauthorizedException({
        success: false,
        error: {
          message: 'Invalid email or password',
          code: 'INVALID_CREDENTIALS',
        },
      });
    }
    const { pair } = await this.createTokenPair(
      user.id,
      user.email,
      user.role,
    );
    await this.saveRefreshToken(user.id, pair.refreshToken);
    return {
      accessToken: pair.accessToken,
      refreshToken: pair.refreshToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      expiresIn: pair.expiresIn,
    };
  }

  async refresh(refreshToken: string): Promise<AuthResponse> {
    if (!refreshToken?.trim()) {
      throw new BadRequestException({
        success: false,
        error: {
          message: 'Refresh token is required',
          code: 'REFRESH_TOKEN_REQUIRED',
        },
      });
    }
    let payload: { sub?: string; email?: string; role?: string; type?: string };
    try {
      payload = this.jwt.verify(refreshToken, {
        secret: this.getRefreshSecret(),
      }) as typeof payload;
    } catch {
      throw new UnauthorizedException({
        success: false,
        error: {
          message: 'Invalid or expired refresh token',
          code: 'INVALID_REFRESH_TOKEN',
        },
      });
    }
    if (payload.type !== 'refresh' || !payload.sub) {
      throw new UnauthorizedException({
        success: false,
        error: {
          message: 'Invalid refresh token',
          code: 'INVALID_REFRESH_TOKEN',
        },
      });
    }
    const tokenHash = hashRefreshToken(refreshToken);
    const stored = await this.prisma.refreshToken.findFirst({
      where: { userId: payload.sub, tokenHash },
      include: { user: true },
    });
    if (!stored || stored.expiresAt < new Date()) {
      if (stored) {
        await this.prisma.refreshToken.deleteMany({
          where: { id: stored.id },
        });
      }
      throw new UnauthorizedException({
        success: false,
        error: {
          message: 'Invalid or expired refresh token',
          code: 'INVALID_REFRESH_TOKEN',
        },
      });
    }
    const storedToken = stored;
    await this.prisma.refreshToken.delete({ where: { id: storedToken.id } });
    const user = storedToken.user;
    const { pair } = await this.createTokenPair(
      user.id,
      user.email,
      user.role,
    );
    await this.saveRefreshToken(user.id, pair.refreshToken);
    return {
      accessToken: pair.accessToken,
      refreshToken: pair.refreshToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      expiresIn: pair.expiresIn,
    };
  }

  async logout(userId: string, refreshToken?: string): Promise<void> {
    if (refreshToken?.trim()) {
      const tokenHash = hashRefreshToken(refreshToken);
      await this.prisma.refreshToken.deleteMany({
        where: { userId, tokenHash },
      });
    } else {
      await this.prisma.refreshToken.deleteMany({ where: { userId } });
    }
  }

  async me(user: RequestUser): Promise<AuthUserResponse> {
    const found = await this.prisma.user.findUnique({
      where: { id: user.userId, deletedAt: null },
      select: { id: true, email: true, role: true },
    });
    if (!found) {
      throw new UnauthorizedException({
        success: false,
        error: {
          message: 'User not found',
          code: 'USER_NOT_FOUND',
        },
      });
    }
    return {
      id: found.id,
      email: found.email,
      role: found.role,
    };
  }
}
