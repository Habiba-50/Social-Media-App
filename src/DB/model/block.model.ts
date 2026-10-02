import { model, models, Schema } from "mongoose";
import { IBlock } from "../../common/interfaces/block.interface";


const blockSchema = new Schema<IBlock>({
    blockerId: { type: Schema.Types.ObjectId, ref: "User" , required:true},
    blockedId: { type: Schema.Types.ObjectId, ref: "User" , required:true},
    deletedAt: { type: Date },
    restoredAt: { type: Date }
},{
    timestamps: true,
    strict: true,
    strictQuery: true,
    collection: 'SOCIAL_MEDIA_APP_BLOCKS'
})

blockSchema.index({blockerId:1,blockedId:1}, {unique:true})


export const BlockModel = models.Block || model<IBlock>('Block', blockSchema)
