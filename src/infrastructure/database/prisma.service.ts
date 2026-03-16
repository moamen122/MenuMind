import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private _connected = false;

  get isConnected(): boolean {
    return this._connected;
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this._connected = true;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(
        '[Prisma] Cannot reach database. Please ensure PostgreSQL (e.g. Supabase) is reachable and DATABASE_URL in .env is correct.\n' +
          '  Error: ' + message
      );
      this._connected = false;
    }
  }

  async onModuleDestroy() {
    if (this._connected) {
      await this.$disconnect();
    }
  }
}
