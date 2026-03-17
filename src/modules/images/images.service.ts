import { Injectable } from '@nestjs/common';

export interface ImageStreamResult {
  body: ReadableStream;
  contentType: string;
}

@Injectable()
export class ImagesService {
  /**
   * Fetch image from URL and return stream + content-type.
   * Used by the proxy endpoint so the frontend can load external images (Pexels, etc.) via same origin.
   */
  async fetchImageStream(imageUrl: string): Promise<ImageStreamResult | null> {
    try {
      const res = await fetch(imageUrl, {
        headers: { Accept: 'image/*' },
        signal: AbortSignal.timeout(15_000),
      });
      if (!res.ok || !res.body) return null;
      const contentType = res.headers.get('content-type') || 'image/jpeg';
      return { body: res.body, contentType };
    } catch {
      return null;
    }
  }
}
