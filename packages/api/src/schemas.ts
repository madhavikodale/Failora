import { z } from "zod";

// ── Request Validation Schemas ──────────────────────────────────────

export const createTargetSchema = z.object({
  name: z.string().min(1).max(200),
  url: z.string().url().refine(
    (u) => u.startsWith("http://") || u.startsWith("https://"),
    { message: "URL must be http or https" }
  ),
  method: z.enum(["GET", "POST", "PUT", "DELETE"]).optional(),
  headers: z.record(z.string()).optional(),
  body: z.unknown().optional(),
});

export const createRunSchema = z.object({
  target_id: z.string().uuid(),
  mode: z.enum(["timeout", "http_429", "http_500", "malformed_response"]),
  timeout_ms: z.number().int().min(100).max(60000).optional(),
  max_retries: z.number().int().min(0).max(10).optional(),
  retry_delay_ms: z.number().int().min(0).max(10000).optional(),
});

export type CreateTargetInput = z.infer<typeof createTargetSchema>;
export type CreateRunInput = z.infer<typeof createRunSchema>;
