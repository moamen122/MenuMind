import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { MenuAnalyticsDto } from './dto/menu-analytics.dto';

@Injectable()
export class PublicAnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  private async getRestaurantIdBySlug(slugOrId: string): Promise<string> {
    const r = await this.prisma.restaurant.findFirst({
      where: { deletedAt: null, OR: [{ slug: slugOrId }, { id: slugOrId }] },
      select: { id: true },
    });
    if (!r) {
      throw new NotFoundException({
        success: false,
        error: { message: 'Menu not found', code: 'NOT_FOUND' },
      });
    }
    return r.id;
  }

  async recordEvent(
    restaurantSlugOrId: string,
    dto: MenuAnalyticsDto,
  ): Promise<{ ok: boolean }> {
    const restaurantId = await this.getRestaurantIdBySlug(restaurantSlugOrId);
    await this.prisma.menuAnalytics.create({
      data: {
        eventType: dto.eventType,
        restaurantId,
        itemId: dto.itemId ?? null,
        categoryId: dto.categoryId ?? null,
      },
    });
    return { ok: true };
  }
}
