import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';

export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      // Surface the first specific field message so clients can show something
      // actionable instead of a generic "Invalid request".
      const firstMessage = Object.values(fieldErrors)
        .flat()
        .find((m): m is string => typeof m === 'string' && m.length > 0);
      return res.status(400).json({
        error: firstMessage || 'Invalid request',
        details: fieldErrors,
      });
    }
    req.body = result.data;
    next();
  };
}
