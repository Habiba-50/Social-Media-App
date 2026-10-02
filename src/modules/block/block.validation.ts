import z from "zod";
import { generalValidationFields } from "../../common/validation";


export const blockValidation = {
    params: z.strictObject({
        blockedId: generalValidationFields.id
    })
}   


export const unblockValidation = blockValidation

export const myBlockedUsersValidation = {
    query: z.strictObject({
        page: z.string().optional().default("1").transform((val) => Number(val)),
        size: z.string().optional().default("10").transform((val) => Number(val)),
        search: z.string().optional()
    })
}


export const isBlockedValidation = blockValidation
