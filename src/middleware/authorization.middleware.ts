import type { NextFunction, Request, Response } from "express";
import { RoleEnum } from "../common/enums";
import { ForbiddenException, MapGraphQLError } from "../common/exceptions";
import {  HydratedDocument } from "mongoose";
import { IUser } from "../common/interfaces";



export const authorization = (accessRoles: RoleEnum[]) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        // console.log(req.user.role);
        if (!req.user || !accessRoles.includes(req.user.role)) {
            throw new ForbiddenException("Unauthorized account")
        }

        next()
    }
}


export const gqlAuthorization = async (accessRoles: RoleEnum[] , user : HydratedDocument<IUser>):Promise<boolean> => {
    if (!user || !accessRoles.includes(user.role)) {
        throw MapGraphQLError(new ForbiddenException("Unauthorized account"))
    }
    return Promise.resolve(true);
}

// export const authorization = (accessRoles = [], tokenType = TokenTypeEnum.ACCESS) => {
//   return async (req, res, next) => {
//     if (!req?.headers?.authorization) {
//       throw BadRequestException({ message: "Missing authorization key" });
//     }

//     req.user = await decodeToken({ token: req.headers?.authorization., tokenType });
//     console.log(req.user.role);

//     if (!accessRoles.includes(req.user.role)) {
//       throw ForbiddenException({ message: "Not allowed account" });
//     }

//     next();
//   };
// };