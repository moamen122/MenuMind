import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AI_PROVIDER_TOKEN } from './providers/ai-provider.interface';
import { OpenAiProvider } from './providers/openai.provider';
import { MockAiProvider } from './providers/mock.provider';
import { FallbackAiProvider } from './providers/fallback.provider';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [ConfigModule, AuthModule],
  controllers: [AiController],
  providers: [
    {
      provide: AI_PROVIDER_TOKEN,
      useFactory: (config: ConfigService) => {
        const useMockOnly =
          config.get<string>('USE_MOCK_AI') === 'true' ||
          !config.get<string>('OPENAI_API_KEY');
        const mock = new MockAiProvider();
        if (useMockOnly) {
          return mock;
        }
        // Try OpenAI first; on 429 or any error, fall back to mock (for testing without quota)
        return new FallbackAiProvider(new OpenAiProvider(config), mock);
      },
      inject: [ConfigService],
    },
    AiService,
  ],
  exports: [AiService],
})
export class AiModule {}
