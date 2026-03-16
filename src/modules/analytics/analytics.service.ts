import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { RestaurantsService } from '../restaurants/restaurants.service';
import { RequestUser } from '../auth/jwt.strategy';
import { CreateAnalyticsEventDto } from './dto/analytics-event.dto';
import { AnalyticsEventType } from '@prisma/client';

export interface ItemAnalytics {
  menuItemId: string;
  menuItemName: string;
  impressions: number;
  clicks: number;
  ctr: number;
}

export interface AnalyticsDashboard {
  totalImpressions: number;
  totalClicks: number;
  mostViewedItems: Array<{ menuItemId: string; name: string; impressions: number }>;
  mostClickedItems: Array<{ menuItemId: string; name: string; clicks: number }>;
}

@Injectable()
export class AnalyticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly restaurantsService: RestaurantsService,
  ) {}

  async trackEvent(dto: CreateAnalyticsEventDto, user: RequestUser) {
    await this.restaurantsService.assertCanAccessRestaurant(
      user.userId,
      dto.restaurantId,
    );
    return this.prisma.analyticsEvent.create({
      data: {
        restaurantId: dto.restaurantId,
        menuItemId: dto.menuItemId,
        eventType: dto.eventType,
        sessionId: dto.sessionId,
      },
    });
  }

  async getItemsAnalytics(restaurantId: string, user: RequestUser): Promise<ItemAnalytics[]> {
    await this.restaurantsService.assertCanAccessRestaurant(
      user.userId,
      restaurantId,
    );

    const items = await this.prisma.menuItem.findMany({
      where: {
        menu: { restaurantId },
        deletedAt: null,
      },
      select: { id: true, name: true },
    });

    const events = await this.prisma.analyticsEvent.groupBy({
      by: ['menuItemId', 'eventType'],
      where: {
        restaurantId,
        menuItemId: { not: null },
      },
      _count: true,
    });

    const byItem = new Map<string, { impressions: number; clicks: number }>();
    for (const e of events) {
      if (!e.menuItemId) continue;
      let row = byItem.get(e.menuItemId);
      if (!row) {
        row = { impressions: 0, clicks: 0 };
        byItem.set(e.menuItemId, row);
      }
      if (e.eventType === AnalyticsEventType.IMPRESSION) row.impressions = e._count;
      if (e.eventType === AnalyticsEventType.CLICK) row.clicks = e._count;
    }

    return items.map((item) => {
      const stats = byItem.get(item.id) ?? { impressions: 0, clicks: 0 };
      const ctr =
        stats.impressions > 0 ? stats.clicks / stats.impressions : 0;
      return {
        menuItemId: item.id,
        menuItemName: item.name,
        impressions: stats.impressions,
        clicks: stats.clicks,
        ctr: Math.round(ctr * 10000) / 10000,
      };
    });
  }

  async getDashboard(restaurantId: string, user: RequestUser): Promise<AnalyticsDashboard> {
    await this.restaurantsService.assertCanAccessRestaurant(
      user.userId,
      restaurantId,
    );

    const [totalImpressions, totalClicks, impressionByItem, clickByItem] =
      await Promise.all([
        this.prisma.analyticsEvent.count({
          where: { restaurantId, eventType: AnalyticsEventType.IMPRESSION },
        }),
        this.prisma.analyticsEvent.count({
          where: { restaurantId, eventType: AnalyticsEventType.CLICK },
        }),
        this.prisma.analyticsEvent.groupBy({
          by: ['menuItemId'],
          where: {
            restaurantId,
            eventType: AnalyticsEventType.IMPRESSION,
            menuItemId: { not: null },
          },
          _count: true,
        }),
        this.prisma.analyticsEvent.groupBy({
          by: ['menuItemId'],
          where: {
            restaurantId,
            eventType: AnalyticsEventType.CLICK,
            menuItemId: { not: null },
          },
          _count: true,
        }),
      ]);

    const itemIds = new Set<string>();
    [...impressionByItem, ...clickByItem].forEach((g) => {
      if (g.menuItemId) itemIds.add(g.menuItemId);
    });
    const itemMap = new Map<string, string>();
    if (itemIds.size > 0) {
      const items = await this.prisma.menuItem.findMany({
        where: { id: { in: Array.from(itemIds) } },
        select: { id: true, name: true },
      });
      items.forEach((i) => itemMap.set(i.id, i.name));
    }

    const mostViewedItems = impressionByItem
      .filter((g) => g.menuItemId)
      .sort((a, b) => (b._count ?? 0) - (a._count ?? 0))
      .slice(0, 10)
      .map((g) => ({
        menuItemId: g.menuItemId!,
        name: itemMap.get(g.menuItemId!) ?? 'Unknown',
        impressions: g._count,
      }));

    const mostClickedItems = clickByItem
      .filter((g) => g.menuItemId)
      .sort((a, b) => (b._count ?? 0) - (a._count ?? 0))
      .slice(0, 10)
      .map((g) => ({
        menuItemId: g.menuItemId!,
        name: itemMap.get(g.menuItemId!) ?? 'Unknown',
        clicks: g._count,
      }));

    return {
      totalImpressions,
      totalClicks,
      mostViewedItems,
      mostClickedItems,
    };
  }
}
