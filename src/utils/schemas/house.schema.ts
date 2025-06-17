import { z } from 'zod';

export const houseSchema = z.object({
    body: z.object({
        groupId: z.number().positive('Group ID must be a positive number').optional(),
        house_name: z.string().min(1, 'House name is required').max(255, 'House name must be 255 characters or less'),
        address: z.string().max(255, 'Address must be 255 characters or less').optional(),
        icon_name: z.string().max(100, 'Icon name must be 100 characters or less').optional(),
        icon_color: z.string().max(50, 'Icon color must be 50 characters or less').optional(),
    }),
});

export const houseIdSchema = z.object({
    params: z.object({
        houseId: z.string().transform((val) => parseInt(val)).refine((val) => val > 0, 'House ID must be a positive number'),
    }),
});

export type HouseInput = z.infer<typeof houseSchema>['body'];
export type HouseIdInput = z.infer<typeof houseIdSchema>['params'];
