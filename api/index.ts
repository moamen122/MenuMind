/**
 * Vercel serverless entry: export the Express app so all routes are handled by NestJS.
 * Requires backend to be built first (npm run build) so dist/app.factory.js exists.
 */
import { getVercelHandler } from '../dist/app.factory';

export default getVercelHandler();
