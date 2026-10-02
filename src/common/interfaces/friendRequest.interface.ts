import { Types } from "mongoose"

export interface IFriendRequest {
    senderId : Types.ObjectId
    receiverId : Types.ObjectId
    status : string
    deletedAt: Date | undefined,
}