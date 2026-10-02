import z from "zod";
import { generalValidationFields } from "../../common/validation";



export const repostValidation = {
    params:z.strictObject({
        postId: generalValidationFields.id
    })
    ,
    body: z.strictObject({
        content: z.string().max(200, "Content must be at most 200 characters long").optional()
    })
}


export const undoRepostValidation = {
    params: z.strictObject({
        repostId: generalValidationFields.id
    })
}


export const getRepostsOfPostValidation = {
    params: z.strictObject({
        postId: generalValidationFields.id
    }),
    query: z.strictObject({
        page: z.string().optional().default("1"),
        size: z.string().optional().default("10")
    })
}

export const paginationValidation = {
    query: z.strictObject({
        page: z.string().optional().default("1"),
        size: z.string().optional().default("10")
    })
}