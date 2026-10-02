import z from "zod"
import { generalValidationFields } from "../../common/validation"


export const sendRequest = {
    params: z.strictObject({
        receiverId: generalValidationFields.id
    })
}

export const acceptRequest = {
    params: z.strictObject({
        requestId: generalValidationFields.id
    })
}

export const rejectRequest = acceptRequest

export const cancelRequest = acceptRequest

export const unfriend = {
    params: z.strictObject({
        personId: generalValidationFields.id
    })
}

export const checkStatus = {
    params: z.strictObject({
        friendId: generalValidationFields.id
    })
}

export const getPendingFriendRequestsSent = {
    query: z.object({
        page: z.string().optional().default("1"),
        size: z.string().optional().default("10")
    })
}

export const getPendingFriendRequestsReceived = getPendingFriendRequestsSent

export const getMyFriends = getPendingFriendRequestsSent