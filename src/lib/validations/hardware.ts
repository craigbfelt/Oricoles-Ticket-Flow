import { z } from "zod";

export const hardwareStatusEnum = z.enum(["active", "inactive", "maintenance"]);
export const deviceTypeEnum = z.enum(["Desktop", "Laptop", "Server", "Tablet", "Phone"]);

export const hardwareSchema = z.object({
  device_name: z.string()
    .min(1, "Device name is required")
    .max(200, "Device name must be less than 200 characters"),
  
  device_type: z.string()
    .max(100, "Device type must be less than 100 characters")
    .optional(),
  
  manufacturer: z.string()
    .max(100, "Manufacturer must be less than 100 characters")
    .optional(),
  
  model: z.string()
    .max(200, "Model must be less than 200 characters")
    .optional(),
  
  serial_number: z.string()
    .max(200, "Serial number must be less than 200 characters")
    .optional(),
  
  processor: z.string()
    .max(200, "Processor must be less than 200 characters")
    .optional(),
  
  ram_gb: z.coerce.number()
    .int("RAM must be a whole number")
    .positive("RAM must be positive")
    .max(1024, "RAM must be less than 1024 GB")
    .optional()
    .nullable(),
  
  storage_gb: z.coerce.number()
    .int("Storage must be a whole number")
    .positive("Storage must be positive")
    .max(100000, "Storage must be less than 100000 GB")
    .optional()
    .nullable(),
  
  os: z.string()
    .max(100, "OS must be less than 100 characters")
    .optional(),
  
  os_version: z.string()
    .max(100, "OS version must be less than 100 characters")
    .optional(),
  
  location: z.string()
    .max(200, "Location must be less than 200 characters")
    .optional(),
  
  branch: z.string()
    .max(100, "Branch must be less than 100 characters")
    .optional(),
  
  purchase_date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)")
    .optional(),
  
  warranty_expires: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)")
    .optional(),
  
  status: hardwareStatusEnum.default("active"),
  
  notes: z.string()
    .max(2000, "Notes must be less than 2000 characters")
    .optional(),
});

export type HardwareFormData = z.infer<typeof hardwareSchema>;
