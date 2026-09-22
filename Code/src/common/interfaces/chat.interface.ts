import { Types } from "mongoose";
import { IUser } from "./user.interface";
import { ChatEnum } from "../enums";

export interface IMessgae{
    content?: string;
    files?: string[];
    likes?: { userId: Types.ObjectId, react: number }[];
    tags?: Types.ObjectId[];

    createdBy: Types.ObjectId | IUser;

    createdAt: Date;
    updatedAt?: Date;
    deletedAt?: Date;
    restoredAt?: Date;
}

export interface IChat{
    participants: (Types.ObjectId | IUser)[];
    messages?:IMessgae[]
    createdBy: Types.ObjectId | IUser;
    type: ChatEnum,
    
    //OVM
    groupName:string;
    groupDescription: string;
    groupIcon: string;
    roomId: string;
    
    createdAt: Date;
    deletedAt?: Date;
    restoredAt?: Date;
}