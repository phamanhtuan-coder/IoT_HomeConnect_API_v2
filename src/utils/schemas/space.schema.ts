import { z } from 'zod';

export const spaceSchema = z.object({
    body: z.object({
        house_id: z.number().positive('House ID must be a positive number').optional(),
        space_name: z.string().min(1, 'Space name is required').max(100, 'Space name must be 100 characters or less'),
        icon_name: z.string().max(100, 'Icon name must be 100 characters or less').optional(),
        icon_color: z.string().max(100, 'Icon color must be 100 characters or less').optional(),
        space_description: z.string().optional(),
    }),
    params: z.object({
        houseId: z.string().transform((val) => parseInt(val)).optional(),
        spaceId: z.string().transform((val) => parseInt(val)).optional()
    }).optional(),
});

export const spaceIdSchema = z.object({
    params: z.object({
        spaceId: z.string().transform((val) => parseInt(val)).refine((val) => val > 0, 'Space ID must be a positive number'),
    }),
});

export type SpaceInput = z.infer<typeof spaceSchema>['body'];
export type SpaceIdInput = z.infer<typeof spaceIdSchema>['params'];
