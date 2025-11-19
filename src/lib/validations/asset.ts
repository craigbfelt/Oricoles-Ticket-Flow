import { z } from "zod";

export const assetStatusEnum = z.enum(["active", "maintenance", "retired", "disposed"]);

export const assetSchema = z.object({
  name: z.string()
    .min(1, "Asset name is required")
    .max(200, "Asset name must be less than 200 characters"),
  
  asset_tag: z.string()
    .max(100, "Asset tag must be less than 100 characters")
    .optional()
    .nullable(),
  
  category: z.string()
    .max(100, "Category must be less than 100 characters")
    .optional()
    .nullable(),
  
  model: z.string()
    .max(200, "Model must be less than 200 characters")
    .optional()
    .nullable(),
  
  serial_number: z.string()
    .max(200, "Serial number must be less than 200 characters")
    .optional()
    .nullable(),
  
  status: assetStatusEnum.default("active"),
  
  location: z.string()
    .max(200, "Location must be less than 200 characters")
    .optional()
    .nullable(),
  
  notes: z.string()
    .max(2000, "Notes must be less than 2000 characters")
    .optional()
    .nullable(),
});

export type AssetFormData = z.infer<typeof assetSchema>;
