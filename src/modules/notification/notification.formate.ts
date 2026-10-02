import { Types } from "mongoose";

export interface IFormattedNotification {
    id: string;
    type: string;
    text: string;
    sender: {
        id: string;
        username: string;
        profileImage?: string;
    };
    postId: Types.ObjectId | null;
    requestId?: Types.ObjectId;
    friendRequestStatus?: string;
    chatId?: Types.ObjectId | null;
    messageId?: Types.ObjectId | null;
    createdAt: Date;
    isRead: boolean;
}


