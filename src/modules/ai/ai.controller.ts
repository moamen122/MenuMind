import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AiService } from './ai.service';
import { ExtractMenuDto, SuggestIngredientsDto } from './dto';
import { JwtAuthGuard } from '../auth/jwt.guard';

@ApiTags('ai')
@Controller('ai')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('extract-menu')
  @ApiOperation({ summary: 'Extract structured menu items from raw menu text' })
  @ApiResponse({ status: 200, description: 'Extracted menu items' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 502, description: 'AI provider error or missing OPENAI_API_KEY' })
  async extractMenu(@Body() dto: ExtractMenuDto) {
    return this.aiService.extractMenu(dto.menuText);
  }

  @Post('suggest-ingredients')
  @ApiOperation({ summary: 'Get AI-suggested ingredients for a dish' })
  @ApiResponse({ status: 200, description: 'Suggested ingredients list' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 502, description: 'AI provider error or missing OPENAI_API_KEY' })
  async suggestIngredients(@Body() dto: SuggestIngredientsDto) {
    return this.aiService.suggestIngredients(dto.dishName);
  }
}
