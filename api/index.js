import { createServer } from '../dist/index.js';

export default async function handler(req, res) {
  const app = await createServer();
  return app(req, res);
}
