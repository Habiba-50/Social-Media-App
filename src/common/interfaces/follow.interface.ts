import { Types } from "mongoose";

export interface IFollow {
    followingId: Types.ObjectId,
    followerId: Types.ObjectId,
    isDeleted: Boolean,
}


