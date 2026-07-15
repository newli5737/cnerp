import { z } from 'zod';

const apiErrorSchema = z.object({
  code: z.string().optional(),
  message: z.string(),
});

export const apiEnvelopeSchema = <T extends z.ZodType>(dataSchema: T) =>
  z.object({
    data: dataSchema,
    meta: z
      .object({
        total: z.number().optional(),
        page: z.number().optional(),
        limit: z.number().optional(),
      })
      .optional(),
    error: apiErrorSchema.optional(),
  });

export type ApiEnvelope<T> = {
  data: T;
  meta?: { total?: number; page?: number; limit?: number };
  error?: { code?: string; message: string };
};

export function getApiErrorMessage(json: object, fallback: string): string {
  const parsed = z
    .object({
      message: z.string().optional(),
      error: apiErrorSchema.optional(),
    })
    .safeParse(json);
  if (!parsed.success) return fallback;
  return parsed.data.message ?? parsed.data.error?.message ?? fallback;
}
