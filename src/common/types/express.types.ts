import { HydratedDocument } from "mongoose";
import { IUser } from "../interfaces";
import { JwtPayload } from "jsonwebtoken";
import { Socket } from "socket.io";

declare module 'express-serve-static-core' {
    interface Request {
        user: HydratedDocument<IUser>;
        decoded: JwtPayload
    }
}

// user + decoded => Required => authentication() + authorization()
// user => Optional => authentication() only

export interface IAuthUser {
  user: HydratedDocument<IUser>;
  decoded: JwtPayload;
}

export interface IAuthSocket extends Socket{
  data:IAuthUser
}