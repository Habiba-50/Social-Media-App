import z from "zod";
import { generalValidationFields, paginationValidationSchema } from "../../common/validation";


export const savePostValidation = {
    params: z.object({
        postId: generalValidationFields.id
    })
}

export const mySavedPostsValidation = {
    query: paginationValidationSchema.query,
}
    