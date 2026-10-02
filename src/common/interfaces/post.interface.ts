import { Types } from "mongoose";
import { IUser } from "./user.interface";
import { AvailabilityEnum } from "../enums";


export interface IPost{
    folderId: string;
    content?: string;
    files?: string[];

    likes?: {userId: Types.ObjectId, react: number}[];
    tags?: Types.ObjectId[];
    availability: AvailabilityEnum;

    createdBy: Types.ObjectId | IUser;
    updatedBy: Types.ObjectId | IUser;

    createdAt: Date;
    updatedAt?: Date;
    deletedAt?: Date;
    restoredAt?: Date;
}