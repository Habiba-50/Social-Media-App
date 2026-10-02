import { model, models, Schema, Types } from "mongoose";
import { IBookmark } from "../../common/interfaces";


const bookmarkSchema = new Schema<IBookmark>({
    userId:{
        type:Types.ObjectId,
        ref:'User'
    },
    postId:{
        type:Types.ObjectId,
        ref:'Post'
    },
    deletedAt:{
        type:Date
    },
    restoredAt:{
        type:Date
    }
}, {
    timestamps: true,
    collection: 'SOCIAL_MEDIA_APP_BOOKMARKS',
    strict: true,
    strictQuery: true,
})

bookmarkSchema.index(
    { userId: 1, postId: 1 },
    {
        unique: true,
        partialFilterExpression: { deletedAt: { $exists: false } }
    })

export const BookmarkModel = models.Bookmark || model<IBookmark>('Bookmark', bookmarkSchema)