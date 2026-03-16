import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { MenuItemsService } from './menu-items.service';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { CurrentUser } from '../auth/auth.decorator';
import { RequestUser } from '../auth/jwt.strategy';
import { CreateMenuItemDto } from './dto/create-menu-item.dto';
import { UpdateMenuItemDto } from './dto/update-menu-item.dto';
import { ListMenuItemsQueryDto } from './dto/list-menu-items-query.dto';

@ApiTags('menu-items')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('menu-items')
export class MenuItemsController {
  constructor(private readonly menuItemsService: MenuItemsService) {}

  @Post()
  @ApiOperation({ summary: 'Create menu item' })
  @ApiResponse({ status: 201, description: 'Menu item created' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 404, description: 'Menu or category not found' })
  create(@Body() dto: CreateMenuItemDto, @CurrentUser() user: RequestUser) {
    return this.menuItemsService.create(dto, user);
  }

  @Get('menu/:menuId/list')
  @ApiOperation({ summary: 'Get menu items by menu with filters, sort and pagination' })
  @ApiResponse({ status: 200, description: 'Paginated list of menu items' })
  listByMenu(
    @Param('menuId') menuId: string,
    @Query() query: ListMenuItemsQueryDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.menuItemsService.findPaginated(menuId, user, {
      search: query.search,
      categoryId: query.categoryId,
      page: query.page,
      limit: query.limit,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    });
  }

  @Get('menu/:menuId')
  @ApiOperation({ summary: 'Get all menu items by menu (no pagination)' })
  @ApiResponse({ status: 200, description: 'List of menu items' })
  findByMenu(
    @Param('menuId') menuId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.menuItemsService.findByMenu(menuId, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get menu item by id' })
  @ApiResponse({ status: 200, description: 'Menu item details' })
  @ApiResponse({ status: 404, description: 'Menu item not found' })
  findOne(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.menuItemsService.findOne(id, user);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update menu item' })
  @ApiResponse({ status: 200, description: 'Menu item updated' })
  @ApiResponse({ status: 404, description: 'Menu item not found' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateMenuItemDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.menuItemsService.update(id, dto, user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete menu item' })
  @ApiResponse({ status: 200, description: 'Menu item deleted' })
  @ApiResponse({ status: 404, description: 'Menu item not found' })
  remove(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.menuItemsService.remove(id, user);
  }
}
