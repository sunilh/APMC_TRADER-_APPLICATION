// Vercel serverless function entry point
import { VercelRequest, VercelResponse } from '@vercel/node';

// Import your Express app
async function createHandler() {
  const { default: app } = await import('../server/index.js');
  return app;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const app = await createHandler();
  return app(req, res);
}