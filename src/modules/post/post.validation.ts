import {z} from 'zod';
import { generalValidationFields } from '../../common/validation';
import { Types } from 'mongoose';
import { fileFieldValidation } from '../../common/utils/multer';



export const createPost = {
    body: z.strictObject({
        content: generalValidationFields.content,
        tags: generalValidationFields.tags,
        availability: generalValidationFields.availability,
        files: z.array(generalValidationFields.file(fileFieldValidation.image)).optional()
    }).superRefine((args, ctx) => {
        if (args.tags?.length) {
            const uniqueTags = [...new Set(args.tags)];
            if (uniqueTags.length !== args.tags.length) {
                ctx.addIssue({
                    code: "custom",
                    path: ['tags'],
                    message: "Duplicated tags are not allowed"
                });
            }

            for (const tag of args.tags) {
                if (!Types.ObjectId.isValid(tag)) {
                    ctx.addIssue({
                        code: "custom",
                        path: ['tags'],
                        message: `Invalid tagged objectId: ${tag}`
                    });
                }
            }
        }
    }),
    // Validated against req.files by the middleware
};

// -----------------------------------------------------------

export const updatePost = {

    body: z.strictObject({

        content: generalValidationFields.content.optional(),

        availability:
            generalValidationFields.availability.optional(),

        removeFiles: z.array(z.string()).optional(),
        files: z.array(generalValidationFields.file(fileFieldValidation.image)).optional(),
        tags: z.array(generalValidationFields.id).optional(),
        removeTags:z.array(generalValidationFields.id).optional(),

    }).superRefine((args,ctx)=>{
        if(!Object.keys(args).length){
            ctx.addIssue({
                code: "custom",
                // path: ['body'],
                message: "Insert data to update",
            });
        }
        if(args.tags?.length){
            const uniqueTags = [...new Set(args.tags)];
            if (uniqueTags.length !== args.tags.length) {
                ctx.addIssue({
                    code: "custom",
                    path: ['tags'],
                    message: "Duplicated tags are not allowed"
                });
            }

            for (const tag of args.tags) {
                if (!Types.ObjectId.isValid(tag)) {
                    ctx.addIssue({
                        code: "custom",
                        path: ['tags'],
                        message: `Invalid tagged objectId: ${tag}`
                    });
                }
            }
        }
    }),

    files: z
        .array(
            generalValidationFields.file(
                fileFieldValidation.image
            )
        )
        .optional(),

    params: z.strictObject({
        postId: generalValidationFields.id
    })
};

// -----------------------------------------------------------

export const deletePost = {
    params: z.strictObject({
        id: z.string().refine((id) => Types.ObjectId.isValid(id), { error: "Invalid post ID" }),
    })
}

// -----------------------------------------------------------

export const getPost = {
    params: z.strictObject({
        id: generalValidationFields.id,
    })
}

// -----------------------------------------------------------

export const reactPost = {
    query: z.strictObject({
        react: z.coerce.number()
    }),
    params: z.strictObject({
        postId: generalValidationFields.id,
    })
}

// -----------------------------------------------------------

export const reactOnPostGQL = z.strictObject({
        postId: generalValidationFields.id,
        react: z.coerce.number()
})

