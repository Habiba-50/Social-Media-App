import { Types } from "mongoose";


export interface IBookmark {
    userId: Types.ObjectId,
    postId: Types.ObjectId,
    deletedAt?: Date,
    restoredAt?: Date
}



