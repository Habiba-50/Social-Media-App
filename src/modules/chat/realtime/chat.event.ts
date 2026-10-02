import { Server } from "socket.io";
import { IAuthSocket } from "../../../common/types/express.types";
import { SocketValidation } from "../../../middleware";
import * as validators from "../chat.validation";
import { chatService } from "../chat.service";
import { redisService, RedisService } from "../../../common/services";
// Event is the router of Socket.io
// And Gateway is the handler of event

function toSocketError(error: any) {
    console.error("chat socket error:", error);
    return {
        message: error?.message || "Something went wrong.",
        statusCode: error?.statusCode,
    };
}


export class ChatEvent {

    // private readonly chatService: ChatService
    private readonly redisService: RedisService

    constructor() {
        // this.chatService = chatService
        this.redisService = redisService
    }

    sayHi = async (socket: IAuthSocket) => {
        try {
            return socket.on("sayHi", async (data) => {
                await SocketValidation(validators.sayHi, data)
                console.log({ data });
                socket.emit("sayHi", "Hello World from server")
            })
        } catch (error) {
            return socket.emit("custom_error", toSocketError(error))
        }

    }

    sendMessage = async (socket: IAuthSocket, io: Server) => {
        return socket.on("sendMessage", async ({ sendTo, content }: { sendTo: string, content: string }): Promise<any> => {
            try {
                console.log(sendTo, content);
                await SocketValidation(validators.sendMessage, { sendTo, content })
                const messageId = await chatService.sendMessage({ sendTo, content }, socket.data.user)

                const socketIds = await this.redisService.getSockets(socket.data.user._id.toString())
                io.to(socketIds).emit("successMessage", { content, sendTo, messageId: messageId.toString() });

                const receiverSocketIds = await this.redisService.getSockets(sendTo)
                if (receiverSocketIds.length) {
                    socket.to(receiverSocketIds).emit("newMessage", { content, sendTo, from: socket.data.user, messageId: messageId.toString() });
                    // Using socket.to() instead of io.to() because I want to send the message only to the receiver
                }

            } catch (error) {
                return socket.emit("custom_error", toSocketError(error))
            }
        })
    }

    sendGroupMessage = async (socket: IAuthSocket, io: Server) => {
        return socket.on("sendGroupMessage", async ({ groupId, content }: { groupId: string, content: string }): Promise<any> => {
            try {
                // console.log(groupId, content);
                await SocketValidation(validators.sendGroupMessage, { groupId, content })
                const { roomId, messageId } = await chatService.sendGroupMessage({ groupId, content }, socket.data.user)

                const socketIds = await this.redisService.getSockets(socket.data.user._id.toString())
                io.to(socketIds).emit("successMessage", { content, groupId, messageId });
                socket.to(roomId).emit("newMessage", { content, groupId, messageId, from: socket.data.user });

            } catch (error) {
                return socket.emit("custom_error", toSocketError(error))
            }
        })
    }

    joinRoom = async (socket: IAuthSocket, io: Server) => {
        return socket.on("join_room", async ({ roomId }: { roomId: string }): Promise<any> => {
            try {
                await SocketValidation(validators.joinRoom, { roomId });
                const authorizedRoomId = await chatService.getAuthorizedGroupRoomId(
                    roomId,
                    socket.data.user._id,
                );
                socket.join(authorizedRoomId);

                const socketIds = await this.redisService.getSockets(socket.data.user._id.toString());
                io.to(socketIds).emit("successMessage", { content: "User joined the room", sendTo: authorizedRoomId });

            } catch (error) {
                return socket.emit("custom_error", toSocketError(error))
            }
        })
    }

    // Edit Message
    editMessage = async (socket: IAuthSocket, io: Server) => {
        return socket.on("editMessage", async ({ chatId, messageId, content }: { chatId: string, messageId: string, content: string }): Promise<any> => {
            try {
                await SocketValidation(validators.editMessage, { chatId, messageId, content })
                const { chat: updatedChat, updatedAt } = await chatService.editMessage({ chatId, messageId, content }, socket.data.user)
                const updatedMessage = updatedChat.messages?.find((message: any) => message._id?.toString() === messageId)

                const socketIds = await this.redisService.getSockets(socket.data.user._id.toString())
                io.to(socketIds).emit("successMessage", {
                    chatId,
                    content: updatedMessage?.content,
                    messageId,
                    updatedAt,
                    edited: updatedMessage?.edited,
                });
                // Note: chatService.editMessage sends "message_edited" to the rest of the participants by itself,
                // so we don't need to broadcast again here.

            } catch (error) {
                return socket.emit("custom_error", toSocketError(error))
            }
        })
    }

    // Delete Message
    deleteMessage = async (socket: IAuthSocket, io: Server) => {
        return socket.on("deleteMessage", async ({ chatId, messageId }: { chatId: string, messageId: string }): Promise<any> => {
            try {
                await SocketValidation(validators.deleteMessage, { chatId, messageId })
                const { deletedAt } = await chatService.deleteMessage({ chatId, messageId }, socket.data.user)

                const socketIds = await this.redisService.getSockets(socket.data.user._id.toString())
                io.to(socketIds).emit("successMessage", { chatId, messageId, deletedAt });

            } catch (error) {
                return socket.emit("custom_error", toSocketError(error))
            }
        })
    }

    reactMessage = async (socket: IAuthSocket, io: Server) => {
        return socket.on("reactMessage", async ({ chatId, messageId, react }: { chatId: string, messageId: string, react: number }): Promise<any> => {
            try {
                await SocketValidation(validators.reactMessage, { chatId, messageId, react });
                const result = await chatService.reactMessage({ chatId, messageId }, { react }, socket.data.user);
                const socketIds = await this.redisService.getSockets(socket.data.user._id.toString());
                io.to(socketIds).emit("message_reacted", result);
            } catch (error) {
                return socket.emit("custom_error", toSocketError(error));
            }
        });
    }


}

export const chatEvent = new ChatEvent();
