import { z } from 'zod';
import { generalValidationFields } from '../../common/validation';



export const follow = {
    params: z.strictObject({
        followingId: generalValidationFields.id
    }),
};

export const unfollow = follow;


export const getFollowersUsers = {
    query: z.object({
        page: z.string().optional().default("1"),
        size: z.string().optional().default("10"),
    })
};

export const getFollowingUsers = getFollowersUsers

