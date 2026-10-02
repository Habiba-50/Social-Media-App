import { Types } from "mongoose";


export interface INotification {
    title : string,
    body : string,
    senderId : Types.ObjectId,
    receiverId: Types.ObjectId,
    isRead:boolean,
    type: string,
    referenceId?: Types.ObjectId,
    messageId?: Types.ObjectId,
    onModel?: string,
    isDeleted?:boolean
}
