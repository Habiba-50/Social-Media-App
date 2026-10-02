import { model, models, Schema, Types } from "mongoose"
import { IChat, IMessgae } from "../../common/interfaces"
import { ChatEnum } from "../../common/enums"

const messageSschema = new Schema<IMessgae>({

    content: {
        type: String,
        minLength: 2,
        maxLength: 50000,
        trim: true,
        required: function (this: IMessgae) {
            return this.files?.length ? false : true
        }
    },
    files: { type: [String] },
    likes: [{ userId: { type: Types.ObjectId, ref: "User" }, react: { type: Number } }],
    tags: [{ type: Types.ObjectId, ref: "User" }],
    createdBy: { type: Types.ObjectId, ref: "User", required: true },
    edited: { type: Boolean, default: false },
    deletedAt: { type: Date },
    restoredAt: { type: Date }

}, {
    timestamps: true,
    strict: true,
    strictQuery: true,
})


const chatSchema = new Schema<IChat>({

    participants: [{ type: Types.ObjectId, ref: "User" , required:true}],
    createdBy: { type: Types.ObjectId, ref: "User" , required:true},
    type: { type: String, enum:ChatEnum, default: ChatEnum.OVO },
    groupName: { type: String ,required:function(this:IChat){
        return this.type === ChatEnum.OVM
    }},
    roomId: { type: String ,required:function(this:IChat){
        return this.type === ChatEnum.OVM
    }
    },
    groupIcon: { type: String },
    groupDescription: { type: String },

    messages: { type: [messageSschema], required: true },
    

    deletedAt: { type: Date },
    restoredAt: { type: Date }
  
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    strict: true,
    strictQuery: true,
    collection: 'SOCIAL_MEDIA_APP_CHATS'
})



chatSchema.pre(["deleteOne", "findOneAndDelete"], function () {

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


export const ChatModel = models.Chat || model<IChat>('Chat', chatSchema)
