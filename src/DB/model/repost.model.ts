import { model, models, Schema } from "mongoose"
import { IRepost } from "../../common/interfaces"


const repostSchema = new Schema<IRepost>({
    originalPostId: { type: Schema.Types.ObjectId, ref: "Post" },
    repostedBy: { type: Schema.Types.ObjectId, ref: "User" },
    content: { type: String,default:"" },
    deletedAt: { type: Date },
    restoredAt: { type: Date }
}, {
    timestamps: true,
    strict: true,
    strictQuery: true,
    collection: 'SOCIAL_MEDIA_APP_REPOSTS'
})

repostSchema.index(
    { originalPostId: 1, repostedBy: 1 },
    {
        unique: true,
        partialFilterExpression: {
            deletedAt: { $exists: false }
        }
    }
)

export const RepostModel = models.Repost || model<IRepost>('Repost', repostSchema)