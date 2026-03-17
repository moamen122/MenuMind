import { Injectable } from '@nestjs/common';

export interface ImageStreamResult {
  body: ReadableStream;
  contentType: string;
}

export interface ImageBufferResult {
  buffer: Buffer;
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

  /**
   * Fetch image as buffer. More reliable than streaming in serverless (Vercel).
   * Uses browser-like headers so CDNs (Pexels, Unsplash) allow the request.
   */
  async fetchImageBuffer(imageUrl: string): Promise<ImageBufferResult | null> {
    try {
      const url = imageUrl.trim();
      const isPexels = url.includes('pexels.com');
      const isUnsplash = url.includes('unsplash.com');
      const headers: Record<string, string> = {
        Accept: 'image/*',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      };
      if (isPexels) headers['Referer'] = 'https://www.pexels.com/';
      if (isUnsplash) headers['Referer'] = 'https://unsplash.com/';

      const res = await fetch(url, {
        headers,
        signal: AbortSignal.timeout(15_000),
        redirect: 'follow',
      });
      if (!res.ok) return null;
      const contentType = res.headers.get('content-type') || 'image/jpeg';
      const arrayBuffer = await res.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      return { buffer, contentType };
    } catch {
      return null;
    }
  }
}
