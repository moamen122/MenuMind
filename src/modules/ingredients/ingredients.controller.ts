import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { IngredientsService } from './ingredients.service';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { CurrentUser } from '../auth/auth.decorator';
import { RequestUser } from '../auth/jwt.strategy';
import { CreateIngredientDto } from './dto/create-ingredient.dto';
import { UpdateIngredientDto } from './dto/update-ingredient.dto';

@ApiTags('ingredients')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ingredients')
export class IngredientsController {
  constructor(private readonly ingredientsService: IngredientsService) {}

  @Post()
  @ApiOperation({ summary: 'Create ingredient' })
  @ApiResponse({ status: 201, description: 'Ingredient created' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  create(@Body() dto: CreateIngredientDto, @CurrentUser() user: RequestUser) {
    return this.ingredientsService.create(dto, user);
  }

  @Get('restaurant/:restaurantId')
  @ApiOperation({ summary: 'Get ingredients by restaurant' })
  @ApiResponse({ status: 200, description: 'List of ingredients' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  findByRestaurant(
    @Param('restaurantId') restaurantId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.ingredientsService.findByRestaurant(restaurantId, user);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update ingredient' })
  @ApiResponse({ status: 200, description: 'Ingredient updated' })
  @ApiResponse({ status: 404, description: 'Ingredient not found' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateIngredientDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.ingredientsService.update(id, dto, user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete ingredient' })
  @ApiResponse({ status: 200, description: 'Ingredient deleted' })
  @ApiResponse({ status: 404, description: 'Ingredient not found' })
  remove(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.ingredientsService.remove(id, user);
  }
}
