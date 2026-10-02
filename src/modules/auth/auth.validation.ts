import { z } from 'zod';
import { generalValidationFields } from '../../common/validation';
import { GenderEnum } from '../../common/enums';

export const email = {
    body: z.strictObject({
        email: generalValidationFields.email,
    })
}

export const login = {
    body: email.body.safeExtend({
        password: generalValidationFields.password,
        fcm: z.string().optional(),
    }).catchall(z.string())
}

export const signup = {
    body: login.body.safeExtend({
        username: generalValidationFields.username,
        phone: generalValidationFields.phone.optional(),
        confirmPassword: generalValidationFields.confirmPassword,
        gender: z.enum(GenderEnum, { error: "Invalid gender" }),
    }).refine((data) => {
        return data.password === data.confirmPassword
    } , {
        error: "Passwords don't match",   
    }),
}

export const confirmEmail = {
    body: email.body.safeExtend({
        otp: generalValidationFields.otp,
    })
}



export const resetPassword = {
    body: email.body.safeExtend({
        password: generalValidationFields.password,
        confirmPassword: generalValidationFields.confirmPassword,
    }).refine((data) => {
        return data.password === data.confirmPassword
    } , {
        error: "Passwords don't match",   
    })
}
