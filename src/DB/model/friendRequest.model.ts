import { model, models, Schema } from "mongoose";
import { IFriendRequest } from "../../common/interfaces";
import { FriendRequestStatusEnum } from "../../common/enums";


const friendRequestSchema = new Schema<IFriendRequest>({
    senderId : {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    receiverId : {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    status : {
        type: String,
        enum: FriendRequestStatusEnum,
    },
    deletedAt : {
        type: Date,
    }
}, {
    timestamps: true,
    collection: 'SOCIAL_MEDIA_APP_FRIEND_REQUESTS',
    strict: true, 
    strictQuery: true
})

friendRequestSchema.index({ recieverId: 1, status: 1 });
friendRequestSchema.index({ senderId: 1, status: 1 });


export const FriendRequest = models.FriendRequest || model<IFriendRequest>("FriendRequest", friendRequestSchema);