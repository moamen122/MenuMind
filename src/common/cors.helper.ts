/**
 * CORS origin logic: allow CORS_ORIGINS list + any *.vercel.app (preview & production).
 * Fixes "blocked by CORS policy" when frontend is served from a Vercel preview URL.
 */
export function getCorsOriginOption(corsOriginsStr: string | undefined): boolean | string[] | ((origin: string, callback: (err: Error | null, allow?: boolean) => void) => void) {
  const allowedList = corsOriginsStr
    ? corsOriginsStr.split(',').map((o) => o.trim()).filter(Boolean)
    : [];

  return (origin: string, callback: (err: Error | null, allow?: boolean) => void) => {
    if (!origin) return callback(null, true);
    if (allowedList.includes(origin)) return callback(null, true);
    if (origin.endsWith('.vercel.app')) return callback(null, true);
    if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) return callback(null, true);
    callback(null, false);
  };
}
