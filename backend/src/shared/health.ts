import type { Request, Response } from 'express';



export function healthCheck(req: Request, res: Response) {
  res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
}
