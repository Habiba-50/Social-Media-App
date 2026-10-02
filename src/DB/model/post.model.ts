import { model, models, Schema, Types } from "mongoose"
import { IPost } from "../../common/interfaces"
import { AvailabilityEnum } from "../../common/enums"


const postSchema = new Schema<IPost>({
    folderId: {
        type: String
   },
    content: {
        type: String,
        minLength: 2,
        maxLength: 50000,
        trim: true,
        required: function () {
            return this.files?.length ? false : true
        }
    },
    files: {
        type: [String]
    },
    availability: {
        type: Number,
        enum: AvailabilityEnum,
        default: AvailabilityEnum.PUBLIC
    },
    likes: [{ userId: { type: Types.ObjectId, ref: "User" }, react: { type: Number } }],
    tags: [{ type: Types.ObjectId, ref: "User" }],
    createdBy: { type: Types.ObjectId, ref: "User", required: true },
    updatedBy: { type: Types.ObjectId, ref: "User" },
    deletedAt : {
        type: Date
    },
    restoredAt : {
        type: Date
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    strict: true,
    strictQuery: true,
    collection: 'SOCIAL_MEDIA_APP_POSTS'
})


// post._id => comment.postID

postSchema.virtual("comments", {
    ref: "Comment",
    localField: "_id",
    foreignField: "postId",
})

postSchema.pre(["deleteOne", "findOneAndDelete"], function () {

    const query = this.getQuery()
    const { force, ...restQuery } = query

    if (force === true) {
        // Hard delete: remove the `force` field so MongoDB doesn't try to match it
        this.setQuery(restQuery)
    } else {
        // Soft-delete guard: only delete documents that are already soft-deleted
        this.setQuery({ deletedAt: { $exists: true }, ...restQuery })
    }

})


export const PostModel = models.Post || model<IPost>('Post', postSchema)