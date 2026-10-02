
import { Types } from 'mongoose';
import { z } from 'zod';
import { AvailabilityEnum } from '../enums';

export const generalValidationFields = {
  email: z.email(),
  password: z
    .string()
    .regex(
      /^(?=.*[a-z]){1,}(?=.*[A-Z]){1,}(?=.*\d){1,}(?=.*\W)[\w\W\d].{8,25}$/,
      {
        error:
          "Password must be 8-25 characters long and include at least one uppercase letter, one lowercase letter, one number, and one special character",
      },
    ),
  username: z
    .string({ error: "Username is mandatory" })
    .min(2, { error: "min is 2 characters" })
    .max(25, { error: "max is 25 characters" }),
  confirmPassword: z.string(),
  phone: z
    .string({ error: "phone is required" })
    .regex(/^(02|2|\+2)?01[0-25]\d{8}$/),
  // gender: z.enum(["male", "female "], { error: "Invalid gender" })

  otp: z
    .string({ error: "OTP is required" })
    .regex(/^\d{6}$/, { error: "OTP must be 6 digits" }),
  
  id: z.string().refine((id) => Types.ObjectId.isValid(id), { error: "Invalid ID" }),

  content: z.string().max(1000, { error: "Content is too long" }).optional(),
  
  tags: z.array(z.string()).optional(),

  availability: z.coerce.number().default(AvailabilityEnum.PUBLIC), 

  file: function (mimetype:string[] = ['any']) {
    return z.strictObject({
      fieldname: z.string(),
      originalname: z.string(),
      encoding: z.string(),
      mimetype: z.enum(mimetype),
      buffer: z.any().optional(),
      path: z.string().optional(),
      size: z.number()
    }).superRefine((args, ctx) => {
      if (!args.path && !args.buffer) {
        ctx.addIssue({
          code: "custom",
          message: "buffer is required",
          path: ['buffer']
        });
      }
    });
  }
};

export const paginationValidationSchema = {
  query: z.object({
    page: z.coerce.number().optional(),
    size: z.coerce.number().optional(),
    search: z.string().optional(),
  })
}

export type PagibanteDto = z.infer<typeof paginationValidationSchema.query>
