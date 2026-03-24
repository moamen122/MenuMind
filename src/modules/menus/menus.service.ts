import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  Logger,
  HttpException,
} from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { RestaurantsService } from '../restaurants/restaurants.service';
import { RequestUser } from '../auth/jwt.strategy';
import { CreateMenuDto } from './dto/create-menu.dto';
import { UpdateMenuDto } from './dto/update-menu.dto';
import { CreateMenuCategoryDto } from './dto/create-menu-category.dto';
import { UpdateMenuCategoryDto } from './dto/update-menu-category.dto';
import { CreateMenuWithItemsDto } from './dto/create-menu-with-items.dto';
import { ImportMenuItemsDto } from './dto/import-menu-items.dto';

@Injectable()
export class MenusService {
  private readonly logger = new Logger(MenusService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly restaurantsService: RestaurantsService,
  ) {}

  async create(dto: CreateMenuDto, user: RequestUser) {
    let restaurantId: string;
    if (dto.restaurantId != null) {
      await this.restaurantsService.assertCanAccessRestaurant(user.userId, dto.restaurantId);
      restaurantId = dto.restaurantId;
    } else {
      const myRestaurant = await this.restaurantsService.getOrCreateForUser(user.userId);
      restaurantId = myRestaurant.id;
    }
    const restaurant = await this.prisma.restaurant.findFirst({
      where: { id: restaurantId, deletedAt: null },
    });
    if (!restaurant) {
      throw new NotFoundException({
        success: false,
        error: { message: 'Restaurant not found', code: 'NOT_FOUND' },
      });
    }
    return this.prisma.menu.create({
      data: {
        restaurantId,
        name: dto.name,
      },
    });
  }

  /**
   * Create a menu with all categories and items (sequential writes for Supabase pooler compatibility;
   * $transaction is unreliable with transaction-mode pooler).
   * When restaurantId is omitted, uses the current user's single restaurant (user = restaurant).
   */
  async createWithItems(dto: CreateMenuWithItemsDto, user: RequestUser) {
    let restaurantId: string;
    if (dto.restaurantId != null) {
      await this.restaurantsService.assertCanAccessRestaurant(user.userId, dto.restaurantId);
      restaurantId = dto.restaurantId;
    } else {
      const myRestaurant = await this.restaurantsService.getOrCreateForUser(user.userId);
      restaurantId = myRestaurant.id;
    }
    const restaurant = await this.prisma.restaurant.findFirst({
      where: { id: restaurantId, deletedAt: null },
    });
    if (!restaurant) {
      throw new NotFoundException({
        success: false,
        error: { message: 'Restaurant not found', code: 'NOT_FOUND' },
      });
    }

    const categoryNames = [
      ...new Set(dto.items.map((i) => i.category?.trim() || 'General')),
    ];

    const menu = await this.prisma.menu.create({
      data: {
        restaurantId,
        name: dto.name,
      },
    });

    try {
      const categoryIds: Record<string, string> = {};
      for (let i = 0; i < categoryNames.length; i++) {
        const cat = await this.prisma.menuCategory.create({
          data: {
            menuId: menu.id,
            name: categoryNames[i],
            sortOrder: i,
          },
        });
        categoryIds[cat.name] = cat.id;
      }

      const defaultCategoryId =
        categoryIds['General'] ?? Object.values(categoryIds)[0];

      for (const item of dto.items) {
        const categoryId =
          categoryIds[item.category?.trim() || ''] ??
          categoryIds['General'] ??
          defaultCategoryId;
        const created = await this.prisma.menuItem.create({
          data: {
            menuId: menu.id,
            categoryId,
            name: item.name,
            imageUrl: item.imageUrl ?? null,
            description: item.description ?? null,
          },
        });
        for (let i = 0; i < item.sizes.length; i++) {
          const s = item.sizes[i];
          await this.prisma.menuItemSize.create({
            data: {
              menuItemId: created.id,
              name: s.name.trim(),
              price: s.price,
              sortOrder: i,
            },
          });
        }
      }
    } catch (err) {
      await this.prisma.menu.delete({ where: { id: menu.id } }).catch(() => {});
      this.logger.warn('createWithItems failed', err instanceof Error ? err.message : err);
      if (err instanceof HttpException) throw err;
      const message = err instanceof Error ? err.message : 'Failed to save menu';
      throw new InternalServerErrorException({
        success: false,
        error: {
          message: process.env.NODE_ENV === 'production' ? 'Failed to save menu. Please try again.' : message,
          code: 'SAVE_FAILED',
        },
      });
    }

    return menu;
  }

  /**
   * Add items to an existing menu, or replace all items (overwrite).
   * When overwrite is true: deletes all menu items and categories for this menu, then creates categories and items from the payload.
   * When overwrite is false: creates missing categories by name, then creates all items.
   */
  async importItems(menuId: string, dto: ImportMenuItemsDto, user: RequestUser) {
    const menu = await this.prisma.menu.findFirst({
      where: { id: menuId, deletedAt: null },
    });
    if (!menu) {
      throw new NotFoundException({
        success: false,
        error: { message: 'Menu not found', code: 'NOT_FOUND' },
      });
    }
    await this.restaurantsService.assertCanAccessRestaurant(
      user.userId,
      menu.restaurantId,
    );

    if (dto.overwrite) {
      const itemIds = await this.prisma.menuItem.findMany({
        where: { menuId, deletedAt: null },
        select: { id: true },
      });
      for (const { id } of itemIds) {
        await this.prisma.menuItemSize.deleteMany({ where: { menuItemId: id } });
      }
      await this.prisma.menuItem.updateMany({
        where: { menuId },
        data: { deletedAt: new Date() },
      });
      await this.prisma.menuCategory.deleteMany({ where: { menuId } });
    }

    const categoryNames = [
      ...new Set(dto.items.map((i) => i.category?.trim() || 'General')),
    ];
    const categoryIds: Record<string, string> = {};

    if (dto.overwrite) {
      for (let i = 0; i < categoryNames.length; i++) {
        const cat = await this.prisma.menuCategory.create({
          data: {
            menuId,
            name: categoryNames[i],
            sortOrder: i,
          },
        });
        categoryIds[cat.name] = cat.id;
      }
    } else {
      const existing = await this.prisma.menuCategory.findMany({
        where: { menuId },
        orderBy: { sortOrder: 'asc' },
      });
      for (const c of existing) {
        categoryIds[c.name] = c.id;
      }
      let sortOrder = existing.length;
      for (const name of categoryNames) {
        if (categoryIds[name]) continue;
        const cat = await this.prisma.menuCategory.create({
          data: { menuId, name, sortOrder: sortOrder++ },
        });
        categoryIds[cat.name] = cat.id;
      }
    }

    const defaultCategoryId =
      categoryIds['General'] ?? Object.values(categoryIds)[0];

    for (const item of dto.items) {
      const categoryId =
        categoryIds[item.category?.trim() || ''] ??
        categoryIds['General'] ??
        defaultCategoryId;
      const created = await this.prisma.menuItem.create({
        data: {
          menuId,
          categoryId,
          name: item.name,
          imageUrl: item.imageUrl ?? null,
          description: item.description ?? null,
        },
      });
      for (let i = 0; i < item.sizes.length; i++) {
        const s = item.sizes[i];
        await this.prisma.menuItemSize.create({
          data: {
            menuItemId: created.id,
            name: s.name.trim(),
            price: s.price,
            sortOrder: i,
          },
        });
      }
    }

    return this.findOne(menuId, user);
  }

  /** Menus for the current user (user = restaurant). */
  async findMyMenus(user: RequestUser) {
    const restaurant = await this.restaurantsService.getOrCreateForUser(user.userId);
    return this.prisma.menu.findMany({
      where: { restaurantId: restaurant.id, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByRestaurant(restaurantId: string, user: RequestUser) {
    await this.restaurantsService.assertCanAccessRestaurant(
      user.userId,
      restaurantId,
    );
    return this.prisma.menu.findMany({
      where: { restaurantId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, user: RequestUser) {
    const menu = await this.prisma.menu.findFirst({
      where: { id, deletedAt: null },
      include: {
        categories: { orderBy: { sortOrder: 'asc' } },
        items: {
          where: { deletedAt: null },
          include: { category: true, sizes: { orderBy: { sortOrder: 'asc' } } },
        },
      },
    });
    if (!menu) {
      throw new NotFoundException({
        success: false,
        error: { message: 'Menu not found', code: 'NOT_FOUND' },
      });
    }
    await this.restaurantsService.assertCanAccessRestaurant(
      user.userId,
      menu.restaurantId,
    );
    return menu;
  }

  async update(id: string, dto: UpdateMenuDto, user: RequestUser) {
    const menu = await this.prisma.menu.findFirst({
      where: { id, deletedAt: null },
    });
    if (!menu) {
      throw new NotFoundException({
        success: false,
        error: { message: 'Menu not found', code: 'NOT_FOUND' },
      });
    }
    await this.restaurantsService.assertCanAccessRestaurant(
      user.userId,
      menu.restaurantId,
    );
    return this.prisma.menu.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string, user: RequestUser) {
    const menu = await this.prisma.menu.findFirst({
      where: { id, deletedAt: null },
    });
    if (!menu) {
      throw new NotFoundException({
        success: false,
        error: { message: 'Menu not found', code: 'NOT_FOUND' },
      });
    }
    await this.restaurantsService.assertCanAccessRestaurant(
      user.userId,
      menu.restaurantId,
    );
    return this.prisma.menu.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  // --- Menu Categories ---

  async createCategory(dto: CreateMenuCategoryDto, user: RequestUser) {
    const menu = await this.prisma.menu.findFirst({
      where: { id: dto.menuId, deletedAt: null },
    });
    if (!menu) {
      throw new NotFoundException({
        success: false,
        error: { message: 'Menu not found', code: 'NOT_FOUND' },
      });
    }
    await this.restaurantsService.assertCanAccessRestaurant(
      user.userId,
      menu.restaurantId,
    );
    return this.prisma.menuCategory.create({
      data: {
        menuId: dto.menuId,
        name: dto.name,
        sortOrder: dto.order ?? 0,
      },
    });
  }

  async findCategoriesByMenu(menuId: string, user: RequestUser) {
    const menu = await this.prisma.menu.findFirst({
      where: { id: menuId, deletedAt: null },
    });
    if (!menu) {
      throw new NotFoundException({
        success: false,
        error: { message: 'Menu not found', code: 'NOT_FOUND' },
      });
    }
    await this.restaurantsService.assertCanAccessRestaurant(
      user.userId,
      menu.restaurantId,
    );
    return this.prisma.menuCategory.findMany({
      where: { menuId },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async updateCategory(
    id: string,
    dto: UpdateMenuCategoryDto,
    user: RequestUser,
  ) {
    const category = await this.prisma.menuCategory.findUnique({
      where: { id },
      include: { menu: true },
    });
    if (!category || category.menu.deletedAt) {
      throw new NotFoundException({
        success: false,
        error: { message: 'Category not found', code: 'NOT_FOUND' },
      });
    }
    await this.restaurantsService.assertCanAccessRestaurant(
      user.userId,
      category.menu.restaurantId,
    );
    const data: { name?: string; sortOrder?: number } = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.order !== undefined) data.sortOrder = dto.order;
    return this.prisma.menuCategory.update({
      where: { id },
      data,
    });
  }

  async removeCategory(id: string, user: RequestUser) {
    const category = await this.prisma.menuCategory.findUnique({
      where: { id },
      include: { menu: true },
    });
    if (!category || category.menu.deletedAt) {
      throw new NotFoundException({
        success: false,
        error: { message: 'Category not found', code: 'NOT_FOUND' },
      });
    }
    await this.restaurantsService.assertCanAccessRestaurant(
      user.userId,
      category.menu.restaurantId,
    );
    return this.prisma.menuCategory.delete({
      where: { id },
    });
  }
}
