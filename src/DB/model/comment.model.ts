import { model, models, Schema, Types } from "mongoose"
import { IComment } from "../../common/interfaces"


const commentSchema = new Schema<IComment>({
    
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

    likes: [{ userId: { type: Types.ObjectId, ref: "User" }, react: { type: String } }],
    tags: [{ type: Types.ObjectId, ref: "User" }],

    postId: { type: Types.ObjectId, ref: "Post" },
    commentId: { type: Types.ObjectId, ref: "Comment" },

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
    collection: 'SOCIAL_MEDIA_APP_COMMENTS'
})

commentSchema.virtual("replies", {
    ref: "Comment",
    localField: "_id",
    foreignField: "commentId",
})

commentSchema.pre(["deleteOne", "findOneAndDelete"], function () {

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


export const CommentModel = models.Comment || model<IComment>('Comment', commentSchema)