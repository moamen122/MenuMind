import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../infrastructure/database/prisma.service";
import { RestaurantsService } from "../restaurants/restaurants.service";
import { RequestUser } from "../auth/jwt.strategy";
import { CostIngredientDto } from "./dto/cost-ingredient.dto";
import type { CostEstimateResponse, CostEstimateIngredient } from "./deepseek-cost-estimate.service";
import { DeepSeekCostEstimateService } from "./deepseek-cost-estimate.service";

type RawIngredient = Partial<CostEstimateIngredient> & { price?: number; unit?: string };

function normalizeIngredientForResponse(i: RawIngredient): CostEstimateIngredient {
  const name = String(i?.name ?? "");
  const quantity_needed = String(i?.quantity_needed ?? "");
  const notes = i?.notes != null ? String(i.notes) : undefined;
  let unit_type: "liquid" | "solid" = (i?.unit_type === "liquid" || i?.unit_type === "solid") ? i.unit_type : "solid";
  let price_per_liter: number | undefined = i?.price_per_liter != null ? Number(i.price_per_liter) : undefined;
  let price_per_kg: number | undefined = i?.price_per_kg != null ? Number(i.price_per_kg) : undefined;

  if ((price_per_liter == null || price_per_liter === 0) && (price_per_kg == null || price_per_kg === 0) && typeof i?.price === "number" && i.price > 0) {
    const price = i.price;
    const unit = String(i?.unit ?? "").toLowerCase();
    const qty = quantity_needed;
    const isLiquid = /\b(ml|l|liter|litre)\b/.test(unit) || /^\d+\s*ml/i.test(qty);
    if (isLiquid) {
      unit_type = "liquid";
      const mlMatch = unit.match(/(\d+(?:\.\d+)?)\s*ml/) || qty.match(/(\d+(?:[.,]\d+)?)\s*ml/i);
      const ml = mlMatch ? parseFloat(mlMatch[1].replace(",", ".")) : 30;
      price_per_liter = ml > 0 ? (price * 1000) / ml : 0;
    } else {
      unit_type = "solid";
      const gMatch = unit.match(/(\d+(?:\.\d+)?)\s*(?:g|gram)/) || qty.match(/(\d+(?:[.,]\d+)?)\s*(g|kg)/i);
      let grams = 1000;
      if (gMatch) {
        const n = parseFloat(gMatch[1].replace(",", "."));
        grams = (gMatch[2] || "g").toLowerCase() === "kg" ? n * 1000 : n;
      }
      price_per_kg = grams > 0 ? (price * 1000) / grams : 0;
    }
  }

  return { name, quantity_needed, unit_type, price_per_liter, price_per_kg, notes };
}

export interface CostCalculationResult {
  totalCost: number;
  profit: number;
  margin: number;
}

@Injectable()
export class CostCalculatorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly restaurantsService: RestaurantsService,
    private readonly deepSeekCostEstimateService: DeepSeekCostEstimateService,
  ) {}

  async calculateForMenuItem(
    menuItemId: string,
    ingredients: CostIngredientDto[],
    user: RequestUser,
  ): Promise<CostCalculationResult> {
    const menuItem = await this.prisma.menuItem.findFirst({
      where: { id: menuItemId, deletedAt: null },
      include: { menu: true, sizes: { orderBy: { sortOrder: 'asc' } } },
    });
    if (!menuItem) {
      throw new NotFoundException({
        success: false,
        error: { message: "Menu item not found", code: "NOT_FOUND" },
      });
    }
    await this.restaurantsService.assertCanAccessRestaurant(
      user.userId,
      menuItem.menu.restaurantId,
    );

    const firstPrice = menuItem.sizes?.[0]?.price;
    const price = firstPrice != null ? Number(firstPrice) : 0;
    const totalCost = ingredients.reduce(
      (sum, i) => sum + i.quantity * i.unitPrice,
      0,
    );
    const profit = price - totalCost;
    const margin = price > 0 ? profit / price : 0;

    return {
      totalCost: Math.round(totalCost * 100) / 100,
      profit: Math.round(profit * 100) / 100,
      margin: Math.round(margin * 10000) / 10000,
    };
  }

  async getSavedCostEstimate(menuItemId: string, user: RequestUser): Promise<CostEstimateResponse | null> {
    const menuItem = await this.prisma.menuItem.findFirst({
      where: { id: menuItemId, deletedAt: null },
      include: { menu: true, costEstimate: true },
    });
    if (!menuItem) {
      throw new NotFoundException({
        success: false,
        error: { message: "Menu item not found", code: "NOT_FOUND" },
      });
    }
    await this.restaurantsService.assertCanAccessRestaurant(
      user.userId,
      menuItem.menu.restaurantId,
    );
    const est = menuItem.costEstimate;
    if (!est) return null;
    const raw = (est.ingredients as RawIngredient[]) ?? [];
    const ingredients = raw.map((i) => normalizeIngredientForResponse(i));
    return {
      dish_name: est.dishName,
      description: est.description ?? "",
      as_of_date: est.asOfDate,
      currency: est.currency,
      data_source: est.dataSource ?? "",
      ingredients,
    };
  }

  async fetchAndSaveCostEstimate(
    menuItemId: string,
    user: RequestUser,
    language?: 'ar' | 'en',
    size?: string,
  ): Promise<CostEstimateResponse> {
    const menuItem = await this.prisma.menuItem.findFirst({
      where: { id: menuItemId, deletedAt: null },
      include: { menu: true },
    });
    if (!menuItem) {
      throw new NotFoundException({
        success: false,
        error: { message: "Menu item not found", code: "NOT_FOUND" },
      });
    }
    await this.restaurantsService.assertCanAccessRestaurant(
      user.userId,
      menuItem.menu.restaurantId,
    );
    const dishName = menuItem.name?.trim() || "Dish";
    const portionSize = size?.trim() || "Regular";
    const estimate = await this.deepSeekCostEstimateService.getCostEstimate(dishName, language, portionSize);
    await this.prisma.menuItemCostEstimate.upsert({
      where: { menuItemId },
      create: {
        menuItemId,
        dishName: estimate.dish_name,
        description: estimate.description || null,
        asOfDate: estimate.as_of_date,
        currency: estimate.currency,
        dataSource: estimate.data_source || null,
        ingredients: estimate.ingredients as object,
      },
      update: {
        dishName: estimate.dish_name,
        description: estimate.description || null,
        asOfDate: estimate.as_of_date,
        currency: estimate.currency,
        dataSource: estimate.data_source || null,
        ingredients: estimate.ingredients as object,
      },
    });
    return estimate;
  }

  async updateSavedEstimateIngredients(
    menuItemId: string,
    user: RequestUser,
    ingredients: CostEstimateIngredient[],
  ): Promise<CostEstimateResponse | null> {
    const menuItem = await this.prisma.menuItem.findFirst({
      where: { id: menuItemId, deletedAt: null },
      include: { menu: true, costEstimate: true },
    });
    if (!menuItem) {
      throw new NotFoundException({
        success: false,
        error: { message: "Menu item not found", code: "NOT_FOUND" },
      });
    }
    await this.restaurantsService.assertCanAccessRestaurant(
      user.userId,
      menuItem.menu.restaurantId,
    );
    const est = menuItem.costEstimate;
    if (!est) return null;
    await this.prisma.menuItemCostEstimate.update({
      where: { menuItemId },
      data: { ingredients: ingredients as unknown as object },
    });
    return this.getSavedCostEstimate(menuItemId, user);
  }
}
