import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { RestaurantsService } from '../restaurants/restaurants.service';
import { RequestUser } from '../auth/jwt.strategy';
import { CreateIngredientDto } from './dto/create-ingredient.dto';
import { UpdateIngredientDto } from './dto/update-ingredient.dto';

@Injectable()
export class IngredientsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly restaurantsService: RestaurantsService,
  ) {}

  async create(dto: CreateIngredientDto, user: RequestUser) {
    await this.restaurantsService.assertCanAccessRestaurant(
      user.userId,
      dto.restaurantId,
    );
    return this.prisma.ingredient.create({
      data: {
        restaurantId: dto.restaurantId,
        name: dto.name,
        unit: dto.unit,
      },
    });
  }

  async findByRestaurant(restaurantId: string, user: RequestUser) {
    await this.restaurantsService.assertCanAccessRestaurant(
      user.userId,
      restaurantId,
    );
    return this.prisma.ingredient.findMany({
      where: { restaurantId, deletedAt: null },
      orderBy: { name: 'asc' },
    });
  }

  async update(id: string, dto: UpdateIngredientDto, user: RequestUser) {
    const ingredient = await this.prisma.ingredient.findFirst({
      where: { id, deletedAt: null },
    });
    if (!ingredient) {
      throw new NotFoundException({
        success: false,
        error: { message: 'Ingredient not found', code: 'NOT_FOUND' },
      });
    }
    await this.restaurantsService.assertCanAccessRestaurant(
      user.userId,
      ingredient.restaurantId,
    );
    return this.prisma.ingredient.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string, user: RequestUser) {
    const ingredient = await this.prisma.ingredient.findFirst({
      where: { id, deletedAt: null },
    });
    if (!ingredient) {
      throw new NotFoundException({
        success: false,
        error: { message: 'Ingredient not found', code: 'NOT_FOUND' },
      });
    }
    await this.restaurantsService.assertCanAccessRestaurant(
      user.userId,
      ingredient.restaurantId,
    );
    return this.prisma.ingredient.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
