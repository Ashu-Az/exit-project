import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

export const validate = (schema: z.ZodType<any>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = schema.safeParse(req);
      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: result.error.errors
        });
      }
      next();
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.message
      });
    }
  };
};