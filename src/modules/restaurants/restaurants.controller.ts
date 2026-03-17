import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { RestaurantsService } from './restaurants.service';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/auth.decorator';
import { CurrentUser } from '../auth/auth.decorator';
import { RequestUser } from '../auth/jwt.strategy';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';
import { UpdateRestaurantDto } from './dto/update-restaurant.dto';
import { PaginationQueryDto } from '../../common/types/pagination.types';

@ApiTags('restaurants')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('restaurants')
export class RestaurantsController {
  constructor(private readonly restaurantsService: RestaurantsService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin')
  @ApiOperation({ summary: 'Create restaurant (owner only)' })
  @ApiResponse({ status: 201, description: 'Restaurant created' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  create(@Body() dto: CreateRestaurantDto, @CurrentUser() user: RequestUser) {
    return this.restaurantsService.create(dto, user);
  }

  @Get('me')
  @ApiOperation({ summary: 'Get my restaurant (user = restaurant)' })
  @ApiResponse({ status: 200, description: 'Current user\'s restaurant' })
  getMyRestaurant(@CurrentUser() user: RequestUser) {
    return this.restaurantsService.getOrCreateForUser(user.userId);
  }

  @Get()
  @ApiOperation({ summary: 'Get restaurants for logged-in user' })
  @ApiResponse({ status: 200, description: 'List of restaurants' })
  findAll(
    @CurrentUser() user: RequestUser,
    @Query() pagination: PaginationQueryDto,
  ) {
    return this.restaurantsService.findAll(user, pagination);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get restaurant details' })
  @ApiResponse({ status: 200, description: 'Restaurant details' })
  @ApiResponse({ status: 404, description: 'Restaurant not found' })
  findOne(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.restaurantsService.findOne(id, user);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update restaurant' })
  @ApiResponse({ status: 200, description: 'Restaurant updated' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Restaurant not found' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateRestaurantDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.restaurantsService.update(id, dto, user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete restaurant' })
  @ApiResponse({ status: 200, description: 'Restaurant deleted' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Restaurant not found' })
  remove(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.restaurantsService.remove(id, user);
  }
}
