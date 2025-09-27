import { z } from "zod";

export const interestsBody = z.object({
  interests: z
    .array(z.string().trim().min(1).transform((s) => s.toLowerCase()))
    .max(200)
    .default([]),
});

export type InterestsBody = z.infer<typeof interestsBody>;

export function normalizeUserId(raw: string) {
  // simple guard — adjust to your ID scheme
  return raw.trim();
}
