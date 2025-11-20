import { z } from "zod";

export const branchSchema = z.object({
  name: z.string().min(1, "Branch name is required").max(200),
  address: z.string().nullish(),
  city: z.string().nullish(),
  state: z.string().nullish(),
  postal_code: z.string().nullish(),
  country: z.string().nullish(),
  phone: z.string().nullish(),
  email: z.string().email().or(z.literal("")).nullish(),
  notes: z.string().nullish(),
});

export type BranchFormData = z.infer<typeof branchSchema>;
