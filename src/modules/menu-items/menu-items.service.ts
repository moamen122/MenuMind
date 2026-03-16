import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { RestaurantsService } from '../restaurants/restaurants.service';
import { RequestUser } from '../auth/jwt.strategy';
import { CreateMenuItemDto } from './dto/create-menu-item.dto';
import { UpdateMenuItemDto } from './dto/update-menu-item.dto';
import { Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class MenuItemsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly restaurantsService: RestaurantsService,
  ) {}

  private async getMenuAndAssertAccess(menuId: string, userId: string) {
    const menu = await this.prisma.menu.findFirst({
      where: { id: menuId, deletedAt: null },
    });
    if (!menu) {
      throw new NotFoundException({
        success: false,
        error: { message: 'Menu not found', code: 'NOT_FOUND' },
      });
    }
    await this.restaurantsService.assertCanAccessRestaurant(userId, menu.restaurantId);
    return menu;
  }

  private includeSizes = { sizes: { orderBy: { sortOrder: 'asc' as const } } };

  async create(dto: CreateMenuItemDto, user: RequestUser) {
    await this.getMenuAndAssertAccess(dto.menuId, user.userId);

    const category = await this.prisma.menuCategory.findFirst({
      where: { id: dto.categoryId, menuId: dto.menuId },
    });
    if (!category) {
      throw new BadRequestException({
        success: false,
        error: {
          message: 'Category not found or does not belong to this menu',
          code: 'BAD_REQUEST',
        },
      });
    }

    const menuItem = await this.prisma.menuItem.create({
      data: {
        menuId: dto.menuId,
        categoryId: dto.categoryId,
        name: dto.name,
        imageUrl: dto.imageUrl ?? null,
        description: dto.description ?? null,
      },
    });

    for (let i = 0; i < dto.sizes.length; i++) {
      const s = dto.sizes[i];
      await this.prisma.menuItemSize.create({
        data: {
          menuItemId: menuItem.id,
          name: s.name.trim(),
          price: new Decimal(s.price),
          sortOrder: i,
        },
      });
    }

    return this.prisma.menuItem.findFirst({
      where: { id: menuItem.id },
      include: { category: true, ...this.includeSizes },
    });
  }

  async findOne(id: string, user: RequestUser) {
    const item = await this.prisma.menuItem.findFirst({
      where: { id, deletedAt: null },
      include: { menu: true, category: true, ...this.includeSizes },
    });
    if (!item) {
      throw new NotFoundException({
        success: false,
        error: { message: 'Menu item not found', code: 'NOT_FOUND' },
      });
    }
    await this.restaurantsService.assertCanAccessRestaurant(
      user.userId,
      item.menu.restaurantId,
    );
    const [withLegacy] = await this.attachLegacySizesIfNeeded([item]);
    return withLegacy ?? item;
  }

  async findByMenu(menuId: string, user: RequestUser) {
    await this.getMenuAndAssertAccess(menuId, user.userId);
    const items = await this.prisma.menuItem.findMany({
      where: { menuId, deletedAt: null },
      include: { category: true, ...this.includeSizes },
      orderBy: { createdAt: 'desc' },
    });
    return this.attachLegacySizesIfNeeded(items);
  }

  /** When items have no sizes, try to read legacy price/size from DB (before drop migration). */
  private async attachLegacySizesIfNeeded(
    items: { id: string; sizes: { name: string; price: unknown }[] }[],
  ) {
    const emptySizeIds = items.filter((i) => !i.sizes?.length).map((i) => i.id);
    if (emptySizeIds.length === 0) return items;
    try {
      const legacy = await this.prisma.$queryRaw<
        { id: string; price: unknown; size: string | null }[]
      >(Prisma.sql`SELECT id, price, size FROM MenuItem WHERE id IN (${Prisma.join(emptySizeIds)})`);
      const legacyById = new Map(legacy.map((r) => [r.id, r]));
      for (const item of items) {
        if (item.sizes?.length === 0) {
          const row = legacyById.get(item.id);
          if (row != null) {
            const price = Number(row.price);
            if (!Number.isNaN(price)) {
              (item as { sizes: { name: string; price: number }[] }).sizes = [
                { name: (row.size && String(row.size).trim()) || 'Regular', price },
              ];
            }
          }
        }
      }
    } catch {
      // Legacy columns may already be dropped
    }
    return items;
  }

  async findPaginated(
    menuId: string,
    user: RequestUser,
    query: {
      search?: string;
      categoryId?: string;
      page?: number;
      limit?: number;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    },
  ) {
    await this.getMenuAndAssertAccess(menuId, user.userId);
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 10));
    const sortBy = query.sortBy ?? 'createdAt';
    const sortOrder = query.sortOrder ?? 'desc';

    const where: {
      menuId: string;
      deletedAt: null;
      categoryId?: string;
      OR?: Array<{ name?: { contains: string }; description?: { contains: string } }>;
    } = { menuId, deletedAt: null };
    if (query.categoryId) {
      where.categoryId = query.categoryId;
    }
    if (query.search?.trim()) {
      const term = query.search.trim();
      where.OR = [
        { name: { contains: term } },
        { description: { contains: term } },
      ];
    }

    const orderBy =
      sortBy === 'category'
        ? { category: { name: sortOrder } }
        : { [sortBy]: sortOrder };

    const [items, total] = await Promise.all([
      this.prisma.menuItem.findMany({
        where,
        include: { category: true, ...this.includeSizes },
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.menuItem.count({ where }),
    ]);

    await this.attachLegacySizesIfNeeded(items);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async update(id: string, dto: UpdateMenuItemDto, user: RequestUser) {
    const item = await this.prisma.menuItem.findFirst({
      where: { id, deletedAt: null },
      include: { menu: true },
    });
    if (!item) {
      throw new NotFoundException({
        success: false,
        error: { message: 'Menu item not found', code: 'NOT_FOUND' },
      });
    }
    await this.restaurantsService.assertCanAccessRestaurant(
      user.userId,
      item.menu.restaurantId,
    );

    if (dto.categoryId !== undefined) {
      const category = await this.prisma.menuCategory.findFirst({
        where: { id: dto.categoryId, menuId: item.menuId },
      });
      if (!category) {
        throw new BadRequestException({
          success: false,
          error: {
            message: 'Category not found or does not belong to this menu',
            code: 'BAD_REQUEST',
          },
        });
      }
    }

    const data: {
      name?: string;
      categoryId?: string;
      imageUrl?: string | null;
      description?: string | null;
    } = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.categoryId !== undefined) data.categoryId = dto.categoryId;
    if (dto.imageUrl !== undefined) data.imageUrl = dto.imageUrl;
    if (dto.description !== undefined) data.description = dto.description;

    await this.prisma.menuItem.update({
      where: { id },
      data,
    });

    if (dto.sizes !== undefined && dto.sizes.length > 0) {
      await this.prisma.menuItemSize.deleteMany({ where: { menuItemId: id } });
      for (let i = 0; i < dto.sizes.length; i++) {
        const s = dto.sizes[i];
        await this.prisma.menuItemSize.create({
          data: {
            menuItemId: id,
            name: s.name.trim(),
            price: new Decimal(s.price),
            sortOrder: i,
          },
        });
      }
    }

    return this.prisma.menuItem.findFirst({
      where: { id },
      include: { menu: true, category: true, ...this.includeSizes },
    });
  }

  async remove(id: string, user: RequestUser) {
    const item = await this.prisma.menuItem.findFirst({
      where: { id, deletedAt: null },
      include: { menu: true },
    });
    if (!item) {
      throw new NotFoundException({
        success: false,
        error: { message: 'Menu item not found', code: 'NOT_FOUND' },
      });
    }
    await this.restaurantsService.assertCanAccessRestaurant(
      user.userId,
      item.menu.restaurantId,
    );
    return this.prisma.menuItem.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
