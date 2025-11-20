import { z } from "zod";

export const chatMessageSchema = z.object({
  user_name: z.string()
    .min(1, "Name is required")
    .max(100, "Name must be less than 100 characters")
    .regex(/^[a-zA-Z\s'-]+$/, "Name can only contain letters, spaces, hyphens, and apostrophes"),
  
  user_email: z.string()
    .trim()
    .max(200, "Email must be less than 200 characters")
    .email("Invalid email address")
    .or(z.literal(""))
    .transform(val => val === "" ? null : val)
    .nullable()
    .optional(),
  
  message: z.string()
    .min(1, "Message is required")
    .max(1000, "Message must be less than 1000 characters"),
  
  is_support_reply: z.boolean().default(false).optional(),
});

export type ChatMessageFormData = z.infer<typeof chatMessageSchema>;
