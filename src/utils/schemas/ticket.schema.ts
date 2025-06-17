import { z } from 'zod';

export const ticketTypeSchema = z.object({
    body: z.object({
        type_name: z
            .string()
            .min(1, "Ticket type name is required")
            .max(50, "Ticket type name must be 50 characters or less"),
        priority: z
            .number()
            .int()
            .min(1, "Priority must be at least 1")
            .max(5, "Priority must not exceed 5")
            .optional()
            .default(1),
        is_active: z.boolean().optional().default(true),
    }),
});

export const updateTicketTypeSchema = z.object({
    body: z.object({
        type_name: z
            .string()
            .min(1, "Ticket type name is required")
            .max(50, "Ticket type name must be 50 characters or less")
            .optional(),
        priority: z
            .number()
            .int()
            .min(1, "Priority must be at least 1")
            .max(5, "Priority must not exceed 5")
            .optional(),
        is_active: z.boolean().optional(),
    }),
});

export const updateTicketTypePrioritySchema = z.object({
    body: z.object({
        priority: z
            .number()
            .int()
            .min(1, "Priority must be at least 1")
            .max(5, "Priority must not exceed 5"),
    }),
});

export const ticketTypeIdSchema = z.object({
    params: z.object({
        ticketTypeId: z
            .string()
            .transform((val) => parseInt(val))
            .refine((val) => val > 0, "Ticket Type ID must be a positive number"),
    }),
});

export const ticketSchema = z.object({
    body: z.object({
        device_serial: z
            .string()
            .max(50, "Device serial must be 50 characters or less")
            .optional(),
        ticket_type_id: z
            .number()
            .int()
            .positive("Ticket type ID must be a positive number"),
        description: z
            .string()
            .max(5000, "Description must be 5000 characters or less")
            .optional(),
        evidence: z.any().optional(),
    }),
});

export const updateTicketSchema = z.object({
    body: z.object({
        description: z
            .string()
            .max(5000, "Description must be 5000 characters or less")
            .optional(),
        evidence: z.any().optional(),
        status: z
            .enum(["pending", "in_progress", "approved", "rejected", "resolved"])
            .optional(),
        assigned_to: z
            .string()
            .max(32, "Assigned to ID must be 32 characters or less")
            .optional(),
        resolve_solution: z
            .string()
            .max(5000, "Resolve solution must be 5000 characters or less")
            .optional(),
    }),
});

export const ticketIdSchema = z.object({
    params: z.object({
        ticketId: z
            .string()
            .transform((val) => (val))
            .refine((val) => val.length > 0, "Ticket ID invalid"),
    }),
});

export const ticketFilterSchema = z.object({
    query: z.object({
        user_id: z
            .string()
            .max(32, "User ID must be 32 characters or less")
            .optional(),
        ticket_type_id: z
            .string()
            .transform((val) => parseInt(val))
            .refine((val) => val > 0, "Ticket type ID must be a positive number")
            .optional(),
        status: z
            .enum(["pending", "in_progress", "approved", "rejected", "resolved"])
            .optional(),
        created_at_start: z
            .string()
            .datetime()
            .optional()
            .transform((val) => (val ? new Date(val) : undefined)),
        created_at_end: z
            .string()
            .datetime()
            .optional()
            .transform((val) => (val ? new Date(val) : undefined)),
        resolved_at_start: z
            .string()
            .datetime()
            .optional()
            .transform((val) => (val ? new Date(val) : undefined)),
        resolved_at_end: z
            .string()
            .datetime()
            .optional()
            .transform((val) => (val ? new Date(val) : undefined)),
    }),
});

export type TicketTypeInput = z.infer<typeof ticketTypeSchema>["body"];
export type UpdateTicketTypeInput = z.infer<typeof updateTicketTypeSchema>["body"];
export type UpdateTicketTypePriorityInput = z.infer<typeof updateTicketTypePrioritySchema>["body"];
export type TicketTypeIdInput = z.infer<typeof ticketTypeIdSchema>["params"];
export type TicketInput = z.infer<typeof ticketSchema>["body"];
export type UpdateTicketInput = z.infer<typeof updateTicketSchema>["body"];
export type TicketIdInput = z.infer<typeof ticketIdSchema>["params"];
export type TicketFilterInput = z.infer<typeof ticketFilterSchema>["query"];
