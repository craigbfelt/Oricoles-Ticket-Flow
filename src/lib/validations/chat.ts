import { z } from "zod";

export const chatMessageSchema = z.object({
  user_name: z.string()
    .min(1, "Name is required")
    .max(100, "Name must be less than 100 characters")
    .regex(/^[a-zA-Z\s'-]+$/, "Name can only contain letters, spaces, hyphens, and apostrophes"),
  
  user_email: z.string()
    .email("Invalid email address")
    .max(200, "Email must be less than 200 characters")
    .optional()
    .nullable(),
  
  message: z.string()
    .min(1, "Message is required")
    .max(1000, "Message must be less than 1000 characters"),
  
  is_support_reply: z.boolean().default(false),
});

export type ChatMessageFormData = z.infer<typeof chatMessageSchema>;
