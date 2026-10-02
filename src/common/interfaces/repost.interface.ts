import { HydratedDocument, Types } from "mongoose";

export interface IRepost {
    originalPostId: Types.ObjectId,
    repostedBy: Types.ObjectId,
    content?: string,
    deletedAt?: Date,
    restoredAt?: Date,
}

export type IRepostDocument = HydratedDocument<IRepost>;