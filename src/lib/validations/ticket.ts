import { z } from "zod";

export const ticketPriorityEnum = z.enum(["low", "medium", "high", "urgent"]);
export const ticketStatusEnum = z.enum(["open", "in_progress", "pending", "resolved", "closed"]);

export const ticketSchema = z.object({
  title: z.string()
    .min(1, "Title is required")
    .max(200, "Title must be less than 200 characters"),
  
  description: z.string()
    .min(1, "Description is required")
    .max(5000, "Description must be less than 5000 characters"),
  
  priority: ticketPriorityEnum,
  
  status: ticketStatusEnum.optional().default("open"),
  
  category: z.string()
    .max(100, "Category must be less than 100 characters")
    .optional()
    .nullable(),
  
  branch: z.string()
    .max(100, "Branch must be less than 100 characters")
    .optional()
    .nullable(),
  
  fault_type: z.string()
    .max(100, "Fault type must be less than 100 characters")
    .optional()
    .nullable(),
  
  user_email: z.string()
    .email("Invalid email address")
    .optional()
    .nullable(),
  
  error_code: z.string()
    .max(100, "Error code must be less than 100 characters")
    .optional()
    .nullable(),
  
  device_serial_number: z.string()
    .max(200, "Device serial number must be less than 200 characters")
    .optional()
    .nullable(),
});

export const ticketUpdateSchema = ticketSchema.extend({
  status: ticketStatusEnum,
  resolved_at: z.string().datetime().optional().nullable(),
});

export type TicketFormData = z.infer<typeof ticketSchema>;
export type TicketUpdateData = z.infer<typeof ticketUpdateSchema>;
