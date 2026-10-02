import { Types } from "mongoose";

export interface IBlock{
    blockerId: Types.ObjectId;
    blockedId: Types.ObjectId;
    deletedAt?: Date;
    restoredAt?: Date;
}

