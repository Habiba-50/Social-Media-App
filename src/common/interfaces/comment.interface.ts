import { Types } from "mongoose";
import { IUser } from "./user.interface";
import { IPost } from "./post.interface";


export interface IComment{
    content?: string;
    files?: string[];

    likes?: {userId: Types.ObjectId, react: number}[];
    tags?: Types.ObjectId[];

    postId?: Types.ObjectId | IPost;
    commentId?: Types.ObjectId | IComment;

    createdBy: Types.ObjectId | IUser;
    updatedBy: Types.ObjectId | IUser;

    createdAt: Date;
    updatedAt?: Date;
    deletedAt?: Date;
    restoredAt?: Date;
}