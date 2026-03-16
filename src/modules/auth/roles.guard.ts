import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { ROLES_KEY } from './auth.decorator';

const ROLE_MAP: Record<string, UserRole> = {
  admin: UserRole.ADMIN,
  owner: UserRole.OWNER,
  staff: UserRole.STAFF,
};

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredRoles?.length) {
      return true;
    }
    const { user } = context.switchToHttp().getRequest();
    if (!user?.role) {
      throw new ForbiddenException({
        success: false,
        error: {
          message: 'Access denied',
          code: 'FORBIDDEN',
        },
      });
    }
    const userRole = user.role as UserRole;
    const hasRole = requiredRoles.some(
      (role) => ROLE_MAP[role?.toLowerCase()] === userRole,
    );
    if (!hasRole) {
      throw new ForbiddenException({
        success: false,
        error: {
          message: 'Insufficient permissions',
          code: 'FORBIDDEN',
        },
      });
    }
    return true;
  }
}
