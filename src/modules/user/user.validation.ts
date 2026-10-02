import z from "zod";
import { generalValidationFields, paginationValidationSchema } from "../../common/validation";


export const profileGQL = z.strictObject({
    search: z.string().min(2, "Search query must be at least 2 character long").optional(),
})


export const searchUserValidation = {
    query: paginationValidationSchema.query.extend({
        search: z.string().min(1, "Search query must be at least 1 character long").max(10, "Search query must be less than 100 character").optional(),
    })
};


export const updateUserValidation = {
    body: z.strictObject({
        bio: z.string().max(100, "Bio must be less than 100 characters").optional(),
        phone: generalValidationFields.phone.optional(),
        username: generalValidationFields.username.optional(),
    }).refine(
        (body) => Object.keys(body).length > 0,
        "At least one field must be provided",
    )
};
