import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { RequestUser } from '../auth/jwt.strategy';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';
import { UpdateRestaurantDto } from './dto/update-restaurant.dto';
import { PaginationQueryDto } from '../../common/types/pagination.types';
import { paginate, PaginatedResult } from '../../common/types/pagination.types';
import { UserRole } from '@prisma/client';

@Injectable()
export class RestaurantsService {
  constructor(private readonly prisma: PrismaService) {}

  async canAccessRestaurant(
    userId: string,
    restaurantId: string,
  ): Promise<boolean> {
    const restaurant = await this.prisma.restaurant.findFirst({
      where: {
        id: restaurantId,
        deletedAt: null,
        OR: [
          { ownerId: userId },
          { members: { some: { userId } } },
        ],
      },
    });
    return !!restaurant;
  }

  async assertCanAccessRestaurant(
    userId: string,
    restaurantId: string,
  ): Promise<void> {
    const canAccess = await this.canAccessRestaurant(userId, restaurantId);
    if (!canAccess) {
      throw new ForbiddenException({
        success: false,
        error: {
          message: 'Access denied to this restaurant',
          code: 'FORBIDDEN',
        },
      });
    }
  }

  private async getRestaurantOrThrow(id: string, userId: string) {
    const restaurant = await this.prisma.restaurant.findFirst({
      where: { id, deletedAt: null },
    });
    if (!restaurant) {
      throw new NotFoundException({
        success: false,
        error: { message: 'Restaurant not found', code: 'NOT_FOUND' },
      });
    }
    await this.assertCanAccessRestaurant(userId, id);
    return restaurant;
  }

  /** Generate URL-safe slug from name (e.g. "Burger House" -> "burger-house") */
  private slugify(name: string): string {
    return name
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || 'menu';
  }

  /**
   * Get the single restaurant for this user (user = restaurant). Creates one with default name if none exists.
   */
  async getOrCreateForUser(userId: string): Promise<{
    id: string;
    name: string;
    slug: string | null;
    logo: string | null;
    currency: string | null;
    ownerId: string;
    createdAt: Date;
    updatedAt: Date;
  }> {
    let restaurant = await this.prisma.restaurant.findFirst({
      where: { ownerId: userId, deletedAt: null },
      orderBy: { createdAt: 'asc' },
    });
    if (!restaurant) {
      const slug = this.slugify('my-menu');
      let uniqueSlug = slug;
      let n = 0;
      while (await this.prisma.restaurant.findFirst({ where: { slug: uniqueSlug } })) {
        uniqueSlug = `${slug}-${++n}`;
      }
      restaurant = await this.prisma.restaurant.create({
        data: {
          name: 'My Menu',
          slug: uniqueSlug,
          currency: 'EGP',
          ownerId: userId,
        },
      });
    }
    return restaurant;
  }

  async create(dto: CreateRestaurantDto, user: RequestUser) {
    if (user.role !== UserRole.OWNER && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException({
        success: false,
        error: {
          message: 'Only owners can create restaurants',
          code: 'FORBIDDEN',
        },
      });
    }
    const slug = dto.slug?.trim() || this.slugify(dto.name);
    let uniqueSlug = slug;
    let n = 0;
    while (await this.prisma.restaurant.findFirst({ where: { slug: uniqueSlug } })) {
      uniqueSlug = `${slug}-${++n}`;
    }
    return this.prisma.restaurant.create({
      data: {
        name: dto.name,
        slug: uniqueSlug,
        logo: dto.logo ?? undefined,
        currency: dto.currency ?? 'EGP',
        ownerId: user.userId,
      },
    });
  }

  async findAll(
    user: RequestUser,
    pagination: PaginationQueryDto,
  ): Promise<PaginatedResult<Awaited<ReturnType<RestaurantsService['findOne']>>>> {
    const { page = 1, limit = 20 } = pagination;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.restaurant.findMany({
        where: {
          deletedAt: null,
          OR: [
            { ownerId: user.userId },
            { members: { some: { userId: user.userId } } },
          ],
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.restaurant.count({
        where: {
          deletedAt: null,
          OR: [
            { ownerId: user.userId },
            { members: { some: { userId: user.userId } } },
          ],
        },
      }),
    ]);

    return paginate(items, total, page, limit);
  }

  async findOne(id: string, user: RequestUser) {
    return this.getRestaurantOrThrow(id, user.userId);
  }

  async update(id: string, dto: UpdateRestaurantDto, user: RequestUser) {
    await this.getRestaurantOrThrow(id, user.userId);
    return this.prisma.restaurant.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string, user: RequestUser) {
    const restaurant = await this.getRestaurantOrThrow(id, user.userId);
    if (restaurant.ownerId !== user.userId) {
      throw new ForbiddenException({
        success: false,
        error: {
          message: 'Only the owner can delete the restaurant',
          code: 'FORBIDDEN',
        },
      });
    }
    return this.prisma.restaurant.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
