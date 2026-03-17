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
import { MenusService } from './menus.service';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { CurrentUser } from '../auth/auth.decorator';
import { RequestUser } from '../auth/jwt.strategy';
import { CreateMenuDto } from './dto/create-menu.dto';
import { UpdateMenuDto } from './dto/update-menu.dto';
import { CreateMenuCategoryDto } from './dto/create-menu-category.dto';
import { UpdateMenuCategoryDto } from './dto/update-menu-category.dto';
import { CreateMenuWithItemsDto } from './dto/create-menu-with-items.dto';

@ApiTags('menus')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('menus')
export class MenusController {
  constructor(private readonly menusService: MenusService) {}

  @Post()
  @ApiOperation({ summary: 'Create menu' })
  @ApiResponse({ status: 201, description: 'Menu created' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  create(@Body() dto: CreateMenuDto, @CurrentUser() user: RequestUser) {
    return this.menusService.create(dto, user);
  }

  @Post('with-items')
  @ApiOperation({ summary: 'Create menu with categories and items in one call' })
  @ApiResponse({ status: 201, description: 'Menu with items created' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  createWithItems(
    @Body() dto: CreateMenuWithItemsDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.menusService.createWithItems(dto, user);
  }

  @Get()
  @ApiOperation({ summary: 'Get my menus (user = restaurant)' })
  @ApiResponse({ status: 200, description: 'List of menus' })
  findMyMenus(@CurrentUser() user: RequestUser) {
    return this.menusService.findMyMenus(user);
  }

  @Get('restaurant/:restaurantId')
  @ApiOperation({ summary: 'Get all menus for a restaurant' })
  @ApiResponse({ status: 200, description: 'List of menus' })
  findByRestaurant(
    @Param('restaurantId') restaurantId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.menusService.findByRestaurant(restaurantId, user);
  }

  @Get(':menuId/categories')
  @ApiOperation({ summary: 'Get categories for a menu' })
  @ApiResponse({ status: 200, description: 'List of categories' })
  findCategories(
    @Param('menuId') menuId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.menusService.findCategoriesByMenu(menuId, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get menu with categories and items' })
  @ApiResponse({ status: 200, description: 'Menu details' })
  @ApiResponse({ status: 404, description: 'Menu not found' })
  findOne(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.menusService.findOne(id, user);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update menu' })
  @ApiResponse({ status: 200, description: 'Menu updated' })
  @ApiResponse({ status: 404, description: 'Menu not found' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateMenuDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.menusService.update(id, dto, user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete menu' })
  @ApiResponse({ status: 200, description: 'Menu deleted' })
  @ApiResponse({ status: 404, description: 'Menu not found' })
  remove(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.menusService.remove(id, user);
  }

  // --- Menu Categories ---

  @Post('categories')
  @ApiOperation({ summary: 'Create menu category' })
  @ApiResponse({ status: 201, description: 'Category created' })
  @ApiResponse({ status: 404, description: 'Menu not found' })
  createCategory(
    @Body() dto: CreateMenuCategoryDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.menusService.createCategory(dto, user);
  }

  @Put('categories/:id')
  @ApiOperation({ summary: 'Update menu category' })
  @ApiResponse({ status: 200, description: 'Category updated' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  updateCategory(
    @Param('id') id: string,
    @Body() dto: UpdateMenuCategoryDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.menusService.updateCategory(id, dto, user);
  }

  @Delete('categories/:id')
  @ApiOperation({ summary: 'Delete menu category' })
  @ApiResponse({ status: 200, description: 'Category deleted' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  removeCategory(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.menusService.removeCategory(id, user);
  }
}
