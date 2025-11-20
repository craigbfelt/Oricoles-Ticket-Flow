import { z } from "zod";

export const assetStatusEnum = z.enum(["active", "maintenance", "retired", "disposed"]);

export const assetSchema = z.object({
  name: z.string().min(1, "Asset name is required").max(200),
  asset_tag: z.string().nullish(),
  category: z.string().nullish(),
  model: z.string().nullish(),
  serial_number: z.string().nullish(),
  status: assetStatusEnum.default("active"),
  location: z.string().nullish(),
  notes: z.string().nullish(),
});

export type AssetFormData = z.infer<typeof assetSchema>;
