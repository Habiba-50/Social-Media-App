import { Types } from "mongoose"

export const toObjectId = (id: string) => { 
    return Types.ObjectId.createFromHexString(id)
}