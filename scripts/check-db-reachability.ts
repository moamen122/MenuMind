/**
 * Check if your PC can reach the database host (TCP). Run with DATABASE_URL set.
 * If TCP fails, your network may block the port or Supabase direct uses IPv6 only
 * — use the Session pooler URI from Supabase Dashboard (Connect → Session mode).
 */
require('dotenv').config();

import * as net from 'net';

function parseDbUrl(url: string): { host: string; port: number } | null {
  try {
    const u = new URL(url.replace(/^postgresql:\/\//, 'https://'));
    const port = u.port ? parseInt(u.port, 10) : 5432;
    return { host: u.hostname, port };
  } catch {
    return null;
  }
}

function tcpConnect(host: string, port: number, timeoutMs: number): Promise<boolean> {
  return new Promise((resolve) => {
    const sock = net.createConnection({ host, port, timeout: timeoutMs }, () => {
      sock.destroy();
      resolve(true);
    });
    sock.on('error', () => resolve(false));
    sock.on('timeout', () => {
      sock.destroy();
      resolve(false);
    });
  });
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('Set DATABASE_URL in .env');
    process.exit(1);
  }

  const parsed = parseDbUrl(url);
  if (!parsed) {
    console.error('Could not parse DATABASE_URL');
    process.exit(1);
  }

  const { host, port } = parsed;
  console.log('Checking TCP reachability from your PC...');
  console.log('  Host:', host);
  console.log('  Port:', port);
  console.log('');

  const ok = await tcpConnect(host, port, 8000);
  if (ok) {
    console.log('  TCP connection: OK (host is reachable).');
    console.log('  If Prisma still fails, check SSL (add ?sslmode=require) or credentials.');
  } else {
    console.log('  TCP connection: FAILED (cannot reach host:port from this PC).');
    console.log('');
    console.log('  Supabase direct connection (db.xxx.supabase.co:5432) often uses IPv6 only.');
    console.log('  Many home/office networks are IPv4-only, so connection fails.');
    console.log('');
    console.log('  Fix: use the Session pooler (IPv4-friendly):');
    console.log('  1. Supabase Dashboard → your project → Connect (top right)');
    console.log('  2. Choose "Session mode" (not Direct). Copy the URI.');
    console.log('  3. It looks like: postgres://postgres.XXXX:PASSWORD@aws-0-REGION.pooler.supabase.com:5432/postgres');
    console.log('  4. In .env set: DATABASE_URL=<that URI>?sslmode=require');
    console.log('  5. Run: npm run db:test');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
