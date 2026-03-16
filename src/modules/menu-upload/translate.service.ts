import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const DEFAULT_LIBRETRANSLATE_URL = 'https://libretranslate.com';

interface LibreTranslateResponse {
  translatedText?: string;
}

@Injectable()
export class TranslateService {
  private readonly baseUrl: string;

  constructor(private readonly config: ConfigService) {
    this.baseUrl =
      this.config.get<string>('LIBRETRANSLATE_URL')?.replace(/\/$/, '') ||
      DEFAULT_LIBRETRANSLATE_URL;
  }

  /**
   * Translate text from Arabic to English using LibreTranslate.
   * Returns the original text if translation fails or is disabled.
   */
  async translateArToEn(text: string): Promise<string> {
    if (!text?.trim()) return text ?? '';
    try {
      const res = await fetch(`${this.baseUrl}/translate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          q: text.trim(),
          source: 'ar',
          target: 'en',
          format: 'text',
        }),
      });
      if (!res.ok) return text;
      const data = (await res.json()) as LibreTranslateResponse;
      return data.translatedText?.trim() || text;
    } catch {
      return text;
    }
  }
}
