"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.chatService = exports.ChatService = void 0;
const exceptions_1 = require("../../common/exceptions");
const objectId_1 = require("../../common/utils/objectId");
const chat_repository_1 = require("../../DB/repository/chat.repository");
const enums_1 = require("../../common/enums");
const user_repository_1 = require("../../DB/repository/user.repository");
const services_1 = require("../../common/services");
const node_crypto_1 = require("node:crypto");
const friendRequest_1 = require("../friendRequest");
const notification_1 = require("../notification");
const block_1 = require("../block");
class ChatService {
    chatRepository;
    userRepository;
    s3Service;
    friendRequestService;
    redisService;
    notificationModuleService;
    notificationService;
    blockService;
    constructor() {
        this.chatRepository = new chat_repository_1.ChatRepository();
        this.userRepository = new user_repository_1.UserRepository();
        this.s3Service = services_1.s3Service;
        this.friendRequestService = friendRequest_1.friendRequestService;
        this.notificationService = new services_1.NotificationService();
        this.notificationModuleService = new notification_1.NotificationModuleService();
        this.redisService = new services_1.RedisService();
        this.blockService = new block_1.BlockService();
    }
    async checkExistingChat(chatId) {
        const chat = await this.chatRepository.findOne({
            filter: { _id: chatId, deletedAt: { $exists: false } }
        });
        if (!chat) {
            throw new exceptions_1.NotFoundException("Chat is not exist");
        }
        if (chat.type !== enums_1.ChatEnum.OVM) {
            throw new exceptions_1.BadRequestException("Chat is not a group chat");
        }
        return chat;
    }
    async checkChatExists(chatId) {
        const chat = await this.chatRepository.findOne({
            filter: { _id: chatId, deletedAt: { $exists: false } }
        });
        if (!chat) {
            throw new exceptions_1.NotFoundException("Chat not found");
        }
        return chat;
    }
    async getChat(participantId, { page, size } = {}, user) {
        const chat = await this.chatRepository.findOneChat({
            filter: {
                participants: { $all: [(0, objectId_1.toObjectId)(participantId), user._id] },
                deletedAt: { $exists: false }
            },
            options: {
                populate: [
                    {
                        path: "participants",
                    }
                ]
            },
            page,
            size
        });
        if (!chat) {
            throw new exceptions_1.NotFoundException("Chat not found");
        }
        return chat;
    }
    async sendMessage({ sendTo, content }, user) {
        let chat = await this.chatRepository.findOneAndUpdate({
            filter: {
                participants: {
                    $all: [(0, objectId_1.toObjectId)(sendTo), user._id]
                },
                deletedAt: { $exists: false }
            },
            update: {
                $push: {
                    messages: {
                        createdBy: user._id,
                        content
                    }
                }
            }
        });
        if (!chat) {
            console.log("Chat not found");
            chat = await this.chatRepository.create({
                data: {
                    participants: [(0, objectId_1.toObjectId)(sendTo), user._id],
                    createdBy: user._id,
                    type: enums_1.ChatEnum.OVO,
                    messages: [
                        {
                            createdBy: user._id,
                            content
                        }
                    ]
                }
            });
        }
    }
    async editMessage({ chatId, messageId, content }, user) {
        await this.checkChatExists((0, objectId_1.toObjectId)(chatId));
        const chat = await this.chatRepository.findOneAndUpdate({
            filter: {
                _id: (0, objectId_1.toObjectId)(chatId),
                "messages._id": (0, objectId_1.toObjectId)(messageId),
                "messages.createdBy": user._id
            },
            update: {
                $set: {
                    "messages.$.content": content,
                    "messages.$.updatedAt": Date.now(),
                }
            },
            options: {
                new: true,
            }
        });
        if (!chat) {
            throw new exceptions_1.NotFoundException("Message not found");
        }
        return chat;
    }
    async deleteMessage({ chatId, messageId }, user) {
        await this.checkChatExists((0, objectId_1.toObjectId)(chatId));
        const chat = await this.chatRepository.findOneAndUpdate({
            filter: {
                _id: (0, objectId_1.toObjectId)(chatId),
                "messages._id": (0, objectId_1.toObjectId)(messageId),
                "messages.createdBy": user._id
            },
            update: {
                $set: {
                    "messages.$.deletedAt": Date.now(),
                }
            },
            options: {
                new: true,
            }
        });
        if (!chat) {
            throw new exceptions_1.NotFoundException("Message not found");
        }
        return chat;
    }
    async createGroupChat(body, user, file) {
        const participantsIds = [...new Set(body.participantsIds.map((id) => (0, objectId_1.toObjectId)(id)))];
        const users = await this.userRepository.findAll({
            filter: { _id: { $in: participantsIds }, deletedAt: { $exists: false } }
        });
        if (users?.length !== participantsIds.length) {
            throw new exceptions_1.NotFoundException("Some participants no longer exist");
        }
        const friendIds = await this.friendRequestService.getAcceptedFriendIds(user._id);
        const friendIdSet = new Set(friendIds.map((id) => id.toString()));
        const allParticipantsAreFriends = participantsIds.every((id) => friendIdSet.has(id.toString()));
        if (!allParticipantsAreFriends) {
            throw new exceptions_1.NotFoundException("Some participants are not friends");
        }
        let group_image;
        const roomId = (0, node_crypto_1.randomUUID)();
        const path = `chat/group/${roomId}`;
        if (file) {
            group_image = (await this.s3Service.uploadAsset({
                path,
                file
            }));
        }
        const chatingGroup = await this.chatRepository.create({
            data: {
                participants: [...participantsIds, user._id],
                createdBy: user._id,
                type: enums_1.ChatEnum.OVM,
                groupName: body.groupName,
                groupIcon: group_image,
                roomId,
                messages: [
                    {
                        createdBy: user._id,
                        content: "Group Created"
                    }
                ]
            }
        });
        return chatingGroup;
    }
    async getGroupChat(groupId, { page, size } = {}, user) {
        const chat = await this.chatRepository.findOneChat({
            filter: {
                _id: (0, objectId_1.toObjectId)(groupId),
                participants: { $in: [user._id] },
                type: enums_1.ChatEnum.OVM,
            },
            options: {
                populate: [
                    {
                        path: "participants",
                        select: "firstName lastName username profilePicture"
                    },
                    {
                        path: "messages.createdBy",
                        select: "firstName lastName username profilePicture"
                    }
                ]
            },
            page,
            size
        });
        if (!chat) {
            throw new exceptions_1.NotFoundException("Chat not found");
        }
        if (chat?.deletedAt) {
            throw new exceptions_1.NotFoundException("Chat not found");
        }
        return chat;
    }
    async sendGroupMessage({ groupId, content }, user) {
        const chat = await this.chatRepository.findOneAndUpdate({
            filter: {
                _id: (0, objectId_1.toObjectId)(groupId),
                participants: { $in: [user._id] },
                type: enums_1.ChatEnum.OVM,
                deletedAt: { $exists: false }
            },
            update: {
                $push: {
                    messages: {
                        createdBy: user._id,
                        content
                    }
                }
            }
        });
        if (!chat) {
            throw new exceptions_1.NotFoundException("Fail to send message in group.");
        }
        return chat.roomId;
    }
    async getMyChats(user, { page = 1, size = 10 } = {}) {
        const userId = user._id;
        const skip = (page - 1) * size;
        const pipeline = [
            {
                $match: {
                    participants: userId,
                    deletedAt: { $exists: false },
                },
            },
            {
                $addFields: {
                    lastMessage: { $arrayElemAt: ["$messages", -1] },
                },
            },
            {
                $addFields: {
                    lastActivityAt: { $ifNull: ["$lastMessage.createdAt", "$createdAt"] },
                },
            },
            { $sort: { lastActivityAt: -1 } },
            {
                $facet: {
                    data: [
                        { $skip: skip },
                        { $limit: size },
                        {
                            $addFields: {
                                otherParticipantId: {
                                    $cond: [
                                        { $eq: ["$type", enums_1.ChatEnum.OVO] },
                                        {
                                            $first: {
                                                $filter: {
                                                    input: "$participants",
                                                    as: "p",
                                                    cond: { $ne: ["$$p", userId] },
                                                },
                                            },
                                        },
                                        null,
                                    ],
                                },
                            },
                        },
                        {
                            $lookup: {
                                from: "SOCIAL_MEDIA_APP_USERS",
                                localField: "otherParticipantId",
                                foreignField: "_id",
                                as: "otherParticipant",
                            },
                        },
                        {
                            $unwind: {
                                path: "$otherParticipant",
                                preserveNullAndEmptyArrays: true,
                            },
                        },
                        {
                            $project: {
                                _id: 0,
                                chatId: "$_id",
                                type: 1,
                                displayName: {
                                    $cond: [
                                        { $eq: ["$type", enums_1.ChatEnum.OVM] },
                                        "$groupName",
                                        {
                                            $concat: [
                                                { $ifNull: ["$otherParticipant.firstName", ""] },
                                                " ",
                                                { $ifNull: ["$otherParticipant.lastName", ""] },
                                            ],
                                        },
                                    ],
                                },
                                displayImage: {
                                    $cond: [
                                        { $eq: ["$type", enums_1.ChatEnum.OVM] },
                                        "$groupIcon",
                                        "$otherParticipant.profilePicture",
                                    ],
                                },
                                lastMessage: {
                                    content: {
                                        $cond: [
                                            { $ifNull: ["$lastMessage.deletedAt", false] },
                                            "This message was deleted",
                                            "$lastMessage.content",
                                        ],
                                    },
                                    hasAttachment: {
                                        $cond: [
                                            { $ifNull: ["$lastMessage.deletedAt", false] },
                                            false,
                                            { $gt: [{ $size: { $ifNull: ["$lastMessage.files", []] } }, 0] },
                                        ],
                                    },
                                    createdAt: "$lastMessage.createdAt",
                                },
                            },
                        },
                    ],
                    totalCount: [{ $count: "count" }],
                },
            },
        ];
        const result = await this.chatRepository.aggregate(pipeline);
        const docs = result[0]?.data || [];
        const total = result[0]?.totalCount?.[0]?.count || 0;
        return {
            docs,
            currentPage: page,
            pageSize: size,
            pages: Math.ceil(total / size),
        };
    }
    async addMembersToGroupChat(userId, chatId, memberIds) {
        const chat = await this.checkExistingChat(chatId);
        if (!chat.participants.includes(userId) || userId.toString() !== chat.createdBy.toString()) {
            throw new exceptions_1.ForbiddenException("You are not authorized to add members to this chat");
        }
        const existingUserIds = chat.participants.map((p) => p.toString());
        const newMemberIds = [...new Set(memberIds)]
            .filter((id) => !existingUserIds.includes(id))
            .map((id) => (0, objectId_1.toObjectId)(id));
        if (newMemberIds.length === 0) {
            return chat;
        }
        const existingNewMembers = await this.userRepository.findAll({
            filter: { _id: { $in: newMemberIds }, deletedAt: { $exists: false } }
        });
        if (existingNewMembers?.length !== newMemberIds.length) {
            throw new exceptions_1.NotFoundException("Some users no longer exist");
        }
        const friendIds = await this.friendRequestService.getAcceptedFriendIds(userId);
        const friendIdSet = new Set(friendIds.map((id) => id.toString()));
        const allAreFriends = newMemberIds.every((id) => friendIdSet.has(id.toString()));
        if (!allAreFriends) {
            throw new exceptions_1.BadRequestException("Some users are not your friends");
        }
        const blockedIds = await this.blockService.getBlockedUserIds(userId);
        const blockedIdSet = new Set(blockedIds.map((id) => id.toString()));
        const noneBlocked = newMemberIds.every((id) => !blockedIdSet.has(id.toString()));
        if (!noneBlocked) {
            throw new exceptions_1.BadRequestException("Some users cannot be added to this chat");
        }
        const updatedChat = await this.chatRepository.findOneAndUpdate({
            filter: { _id: chatId },
            update: { $push: { participants: { $each: newMemberIds } } },
            options: { new: true }
        });
        if (!updatedChat) {
            throw new exceptions_1.BadRequestException("Failed to add members");
        }
        for (const memberId of newMemberIds) {
            try {
                console.log("hellooo");
                await this.notificationModuleService.createNotification({
                    title: "Added to group",
                    body: `You were added to ${chat.groupName}`,
                    senderId: userId,
                    receiverId: memberId,
                    type: enums_1.NotificationType.GROUP_ADD,
                    onModel: "Chat",
                    referenceId: chat._id,
                });
            }
            catch (error) {
                console.log("Failed to create notification:", error);
            }
            const tokens = await this.redisService.getFCMs(memberId);
            if (tokens?.length) {
                try {
                    await this.notificationService.sendNotifications({
                        userId: memberId,
                        tokens,
                        title: "Added to group",
                        body: `You were added to ${chat.groupName}`,
                        entityId: chat._id.toString(),
                        entityType: "chat",
                        senderId: userId.toString(),
                        type: enums_1.NotificationType.GROUP_ADD,
                    });
                }
                catch (error) {
                    console.log("Failed to send notification:", error);
                }
            }
        }
        return updatedChat;
    }
    async removeMemberFromGroupChat(userId, chatId, memberId) {
        const chat = await this.checkExistingChat(chatId);
        const participantIds = chat.participants.map(p => p.toString());
        if (!participantIds.includes(userId.toString()) || userId.toString() !== chat.createdBy.toString()) {
            throw new exceptions_1.ForbiddenException("You are not authorized to remove members from this chat");
        }
        if (!participantIds.includes(memberId.toString())) {
            throw new exceptions_1.BadRequestException("This user is not a participant in this chat");
        }
        if (memberId.toString() === chat.createdBy.toString()) {
            throw new exceptions_1.BadRequestException("You cannot remove the admin from the chat");
        }
        const updatedChat = await this.chatRepository.findOneAndUpdate({
            filter: { _id: chatId },
            update: { $pull: { participants: memberId } },
            options: { new: true }
        });
        if (!updatedChat) {
            throw new exceptions_1.BadRequestException("Failed to remove member");
        }
        return updatedChat;
    }
    async leaveGroupChat(userId, chatId) {
        const chat = await this.checkExistingChat(chatId);
        const participantIds = chat.participants.map(p => p.toString());
        if (!participantIds.includes(userId.toString())) {
            throw new exceptions_1.ForbiddenException("You are not authorized to leave this chat");
        }
        if (userId.toString() === chat.createdBy.toString()) {
            throw new exceptions_1.ForbiddenException("Admin cannot leave the group. Delete the group instead.");
        }
        const updatedChat = await this.chatRepository.findOneAndUpdate({
            filter: { _id: chatId },
            update: { $pull: { participants: userId } },
            options: { new: true }
        });
        if (!updatedChat) {
            throw new exceptions_1.BadRequestException("Failed to leave chat");
        }
        return updatedChat;
    }
    async deleteGroupChat(userId, chatId) {
        const chat = await this.checkExistingChat(chatId);
        if (userId.toString() !== chat.createdBy.toString()) {
            throw new exceptions_1.ForbiddenException("Only admin can delete the group.");
        }
        const updatedChat = await this.chatRepository.findOneAndUpdate({
            filter: { _id: chatId },
            update: { deletedAt: new Date() },
            options: { new: true }
        });
        if (!updatedChat) {
            throw new exceptions_1.BadRequestException("Failed to delete group");
        }
        return updatedChat;
    }
    async editGroupChat(userId, chatId, updates, file) {
        const chat = await this.checkExistingChat(chatId);
        if (userId.toString() !== chat.createdBy.toString()) {
            throw new exceptions_1.ForbiddenException("Only admin can edit the group.");
        }
        const { groupName, groupDescription } = updates;
        if (!groupName && !groupDescription && !file) {
            throw new exceptions_1.BadRequestException("Nothing to update");
        }
        let groupIcon;
        if (file) {
            const path = `chat/group/${chat.roomId}`;
            groupIcon = await this.s3Service.uploadAsset({ path, file });
            if (chat.groupIcon && chat.groupIcon !== groupIcon) {
                await this.s3Service.deleteAsset({ Key: chat.groupIcon });
            }
        }
        const updateData = {};
        if (groupName)
            updateData.groupName = groupName;
        if (groupDescription)
            updateData.groupDescription = groupDescription;
        if (groupIcon)
            updateData.groupIcon = groupIcon;
        const updatedChat = await this.chatRepository.findOneAndUpdate({
            filter: { _id: chatId },
            update: updateData,
            options: { new: true }
        });
        if (!updatedChat) {
            throw new exceptions_1.BadRequestException("Failed to edit group");
        }
        return updatedChat;
    }
}
exports.ChatService = ChatService;
exports.chatService = new ChatService();
