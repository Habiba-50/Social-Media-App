import { z } from "zod";

export const sayHi = z.strictObject({
    name: z.string().min(2)
})

export const sendMessage = z.strictObject({
    sendTo: z.string(),
    content: z.string()
})

export const sendGroupMessage = z.strictObject({
    groupId: z.string(),
    content: z.string()
})

export const joinRoom = z.strictObject({
    roomId: z.string().uuid(),
})

export const editMessage = z.strictObject({
    chatId: z.string(),
    messageId: z.string(),
    content: z.string()
})


export const deleteMessage = z.strictObject({
    chatId: z.string(),
    messageId: z.string()
})

export const reactMessage = z.strictObject({
    chatId: z.string(),
    messageId: z.string(),
    // 0 clears a reaction; 1-6 match ReactEnum values used by post reactions.
    react: z.coerce.number().int().min(0).max(6),
})
