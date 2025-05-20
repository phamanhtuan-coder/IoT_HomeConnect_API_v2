import { z } from 'zod';

export const spaceSchema = z.object({
    body: z.object({
        houseId: z.number().positive('House ID must be a positive number'),
        space_name: z.string().min(1, 'Space name is required').max(255, 'Space name must be 255 characters or less'),
    }),
});

export const spaceIdSchema = z.object({
    params: z.object({
        spaceId: z.string().transform((val) => parseInt(val)).refine((val) => val > 0, 'Space ID must be a positive number'),
    }),
});

export type SpaceInput = z.infer<typeof spaceSchema>['body'];
export type SpaceIdInput = z.infer<typeof spaceIdSchema>['params'];
