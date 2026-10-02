import { model, models, Schema } from "mongoose";
import { IFollow } from "../../common/interfaces/index";


const followSchema = new Schema<IFollow>({
    followingId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    followerId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    isDeleted: {
        type: Boolean,
        // default: false
    }
}, { 
    timestamps: true, 
    collection: 'SOCIAL_MEDIA_APP_FOLLOWS',
    strict: true, 
    strictQuery: true
 });

followSchema.index(
    {
        followerId: 1,
        followingId: 1,
    },
    {
        unique: true,
    }
);

export const Follow = models.Follow || model<IFollow>("Follow", followSchema);