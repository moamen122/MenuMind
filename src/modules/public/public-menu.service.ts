import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';

export interface PublicRestaurant {
  id: string;
  name: string;
  logo: string | null;
  currency: string;
}

export interface PublicCategory {
  id: string;
  name: string;
  sort_order: number;
}

export interface PublicMenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image: string | null;
  category_id: string;
}

export interface PublicMenuResponse {
  restaurant: PublicRestaurant;
  categories: PublicCategory[];
  items: PublicMenuItem[];
}

@Injectable()
export class PublicMenuService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get full menu by restaurant slug (or id for backwards compatibility).
   * No auth required.
   */
  async getBySlug(slugOrId: string): Promise<PublicMenuResponse> {
    const restaurant = await this.prisma.restaurant.findFirst({
      where: {
        deletedAt: null,
        OR: [{ slug: slugOrId }, { id: slugOrId }],
      },
      include: {
        menus: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            categories: { orderBy: { sortOrder: 'asc' } },
            items: {
              where: { deletedAt: null },
              include: {
                category: true,
                sizes: { orderBy: { sortOrder: 'asc' } },
              },
              orderBy: [{ category: { sortOrder: 'asc' } }, { createdAt: 'asc' }],
            },
          },
        },
      },
    });

    if (!restaurant || !restaurant.menus.length) {
      throw new NotFoundException({
        success: false,
        error: { message: 'Menu not found', code: 'NOT_FOUND' },
      });
    }

    const menu = restaurant.menus[0];
    const categories: PublicCategory[] = menu.categories
      .slice()
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((c) => ({
        id: c.id,
        name: c.name,
        sort_order: c.sortOrder,
      }));

    const categoryOrder = new Map(categories.map((c, i) => [c.id, i]));
    const items: PublicMenuItem[] = menu.items
      .map((item) => {
        const firstSize = item.sizes[0];
        const price = firstSize ? Number(firstSize.price) : 0;
        return {
          id: item.id,
          name: item.name,
          description: item.description ?? null,
          price,
          image: item.imageUrl ?? null,
          category_id: item.categoryId,
        };
      })
      .sort((a, b) => (categoryOrder.get(a.category_id) ?? 0) - (categoryOrder.get(b.category_id) ?? 0));

    return {
      restaurant: {
        id: restaurant.id,
        name: restaurant.name,
        logo: restaurant.logo ?? null,
        currency: restaurant.currency ?? 'EGP',
      },
      categories,
      items,
    };
  }
}
