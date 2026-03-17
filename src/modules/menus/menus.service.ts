import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { RestaurantsService } from '../restaurants/restaurants.service';
import { RequestUser } from '../auth/jwt.strategy';
import { CreateMenuDto } from './dto/create-menu.dto';
import { UpdateMenuDto } from './dto/update-menu.dto';
import { CreateMenuCategoryDto } from './dto/create-menu-category.dto';
import { UpdateMenuCategoryDto } from './dto/update-menu-category.dto';
import { CreateMenuWithItemsDto } from './dto/create-menu-with-items.dto';

@Injectable()
export class MenusService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly restaurantsService: RestaurantsService,
  ) {}

  async create(dto: CreateMenuDto, user: RequestUser) {
    await this.restaurantsService.assertCanAccessRestaurant(
      user.userId,
      dto.restaurantId,
    );
    const restaurant = await this.prisma.restaurant.findFirst({
      where: { id: dto.restaurantId, deletedAt: null },
    });
    if (!restaurant) {
      throw new NotFoundException({
        success: false,
        error: { message: 'Restaurant not found', code: 'NOT_FOUND' },
      });
    }
    return this.prisma.menu.create({
      data: {
        restaurantId: dto.restaurantId,
        name: dto.name,
      },
    });
  }

  /**
   * Create a menu with all categories and items (sequential writes for Supabase pooler compatibility;
   * $transaction is unreliable with transaction-mode pooler).
   */
  async createWithItems(dto: CreateMenuWithItemsDto, user: RequestUser) {
    await this.restaurantsService.assertCanAccessRestaurant(
      user.userId,
      dto.restaurantId,
    );
    const restaurant = await this.prisma.restaurant.findFirst({
      where: { id: dto.restaurantId, deletedAt: null },
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
        restaurantId: dto.restaurantId,
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

      const createOneItemWithSizes = async (
        item: (typeof dto.items)[number],
      ) => {
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
          },
        });
        await Promise.all(
          item.sizes.map((s, i) =>
            this.prisma.menuItemSize.create({
              data: {
                menuItemId: created.id,
                name: s.name.trim(),
                price: s.price,
                sortOrder: i,
              },
            }),
          ),
        );
      };

      await Promise.all(dto.items.map(createOneItemWithSizes));
    } catch (err) {
      await this.prisma.menu.delete({ where: { id: menu.id } }).catch(() => {});
      throw err;
    }

    return menu;
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
