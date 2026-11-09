import type { Request, Response, NextFunction } from 'express';
import type { ZodSchema, ZodError } from 'zod';

type Source = 'body' | 'query' | 'params';

function formatZodError(err: ZodError) {
  return err.errors.map((e) => ({
    path: e.path.join('.') || '(root)',
    message: e.message,
  }));
}

/**
 * Express middleware: validate req[source] against a Zod schema.
 * On success, replaces the source with the parsed (coerced/transformed) value.
 */
export function validate(schema: ZodSchema, source: Source = 'body') {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      return res.status(400).json({
        error: 'Validierung fehlgeschlagen',
        details: formatZodError(result.error),
      });
    }
    // Attach parsed data so handlers use cleaned values
    (req as any)[source] = result.data;
    next();
  };
}
