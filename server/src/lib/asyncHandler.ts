import type { NextFunction, Request, Response } from 'express';

type AsyncHandler = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;

/** Envuelve handlers async para que los errores lleguen al error handler de Express. */
export function asyncHandler(fn: AsyncHandler) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}
