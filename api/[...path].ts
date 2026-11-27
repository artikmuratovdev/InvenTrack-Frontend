import type { Request, Response } from 'express';
import { app, serverReady } from '../server.ts';

export default async function handler(req: Request, res: Response) {
  await serverReady;
  app(req, res);
}
