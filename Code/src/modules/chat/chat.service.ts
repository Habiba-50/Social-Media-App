import { HydratedDocument, Types } from "mongoose";
import { BadRequestException, ForbiddenException, NotFoundException } from "../../common/exceptions";
import { IChat, IUser } from "../../common/interfaces";
import { toObjectId } from "../../common/utils/objectId";
import { ChatRepository } from "../../DB/repository/chat.repository";
import { ChatEnum, NotificationType } from "../../common/enums";
import { UserRepository } from "../../DB/repository/user.repository";
import { NotificationService, RedisService, s3Service } from "../../common/services";
import { randomUUID } from "node:crypto";
import { friendRequestService, FriendRequestService } from "../friendRequest";
import { NotificationModuleService } from "../notification";
import { BlockService } from "../block";


export class ChatService {
    private chatRepository: ChatRepository
    private userRepository: UserRepository
    private s3Service: typeof s3Service
    private friendRequestService: FriendRequestService
    private redisService: RedisService
    private notificationModuleService: NotificationModuleService
    private notificationService: NotificationService
    private blockService: BlockService
   
    constructor() {
        this.chatRepository = new ChatRepository()
        this.userRepository = new UserRepository()
        this.s3Service = s3Service
        this.friendRequestService = friendRequestService
        this.notificationService = new NotificationService()
        this.notificationModuleService = new NotificationModuleService()
        this.redisService = new RedisService()
        this.blockService = new BlockService()
    }

    // ---------------------------- Check Chat Exisiting----------------------

    //Group
    private async checkExistingChat(chatId:Types.ObjectId): Promise<HydratedDocument<IChat> & { _id: Types.ObjectId }> {
        // 1️⃣ Chat must exist
        const chat = await this.chatRepository.findOne({
            filter: { _id: chatId, deletedAt: { $exists: false } }
        });

        if (!chat) {
            throw new NotFoundException("Chat is not exist");
        }

        // 2️⃣ Must be a group chat
        if (chat.type !== ChatEnum.OVM) {
            throw new BadRequestException("Chat is not a group chat");
        }
        return chat
    }

    // Chat
    private async checkChatExists(chatId: Types.ObjectId): Promise<HydratedDocument<IChat> & { _id: Types.ObjectId }> {
        const chat = await this.chatRepository.findOne({
            filter: { _id: chatId, deletedAt: { $exists: false } }
        });
        if (!chat) {
            throw new NotFoundException("Chat not found");
        }
        return chat;
    }

    // --------------------------- Get Chat -----------------------------------

    async getChat(participantId: string, { page, size }: { page?: string; size?: string } = {}, user: HydratedDocument<IUser>): Promise<IChat | undefined> {
        const chat = await this.chatRepository.findOneChat({
            filter:
            {
                participants: { $all: [toObjectId(participantId), user._id] },
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
        })

        if (!chat) {

            throw new NotFoundException("Chat not found")
        }

        return chat
    }

    // --------------------------- Send Message -----------------------------------

    async sendMessage({ sendTo, content }: { sendTo: string, content: string }, user: HydratedDocument<IUser>): Promise<void> {

        // Update the chat if exists
        let chat = await this.chatRepository.findOneAndUpdate({
            filter: {
                participants: {
                    $all: [toObjectId(sendTo), user._id]
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
            // options: {
            //     new: true,
            //     upsert: true,
            //     populate: [
            //         {
            //             path: "participants",
            //             select: "username" 
            //         }
            //     ]
            // }
        })

        if (!chat) {
            console.log("Chat not found");
            chat = await this.chatRepository.create({
                data: {
                    participants: [toObjectId(sendTo), user._id],
                    createdBy: user._id,
                    type: ChatEnum.OVO,
                    messages: [
                        {
                            createdBy: user._id,
                            content
                        }
                    ]
                }
            })
        }

    }

    // --------------------------- Edit Message -----------------------------------

    async editMessage({ chatId, messageId, content }: { chatId: string, messageId: string, content: string }, user: HydratedDocument<IUser>): Promise<void | IChat> {
        await this.checkChatExists(toObjectId(chatId))
        const chat = await this.chatRepository.findOneAndUpdate({
            filter: {
                _id: toObjectId(chatId),
                "messages._id": toObjectId(messageId),
                "messages.createdBy": user._id
            },
            update: {
                $set: {
                    "messages.$.content": content,
                    "messages.$.updatedAt": Date.now(),
                }
            },
            options:{
                new: true,
            }
        })
        if (!chat) {
            throw new NotFoundException("Message not found")
        }
        
        return chat
    }

    // ---------------------------  Delete Message -----------------------------------

    async deleteMessage({ chatId, messageId }: { chatId: string, messageId: string }, user: HydratedDocument<IUser>): Promise<void | IChat> {
        await this.checkChatExists(toObjectId(chatId))
        const chat = await this.chatRepository.findOneAndUpdate({
            filter: {
                _id: toObjectId(chatId),
                "messages._id": toObjectId(messageId),
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
        })
        if (!chat) {
            throw new NotFoundException("Message not found")
        }

        return chat
    }


    // --------------------------- Create Group Chat -----------------------------------
    async createGroupChat(body: { groupName: string, participantsIds: string[] | Types.ObjectId[] }, user: HydratedDocument<IUser>, file?: Express.Multer.File,): Promise<IChat | undefined> {

        const participantsIds = [... new Set(body.participantsIds.map((id) => toObjectId(id as string)))]
        // To get a unique list of users 
        // console.log("Current user:", user._id.toString());
        // console.log("Participants:", participantsIds.map(id => id.toString()));

        // check if all participants exist in DB ( not deleted )
        const users = await this.userRepository.findAll({
            filter: { _id: { $in: participantsIds }, deletedAt: { $exists: false } }
        });
        if (users?.length !== participantsIds.length) {
            throw new NotFoundException("Some participants no longer exist");
        }

        // Check if all participants are friends ( with the creator )
        const friendIds = await this.friendRequestService.getAcceptedFriendIds(user._id);
        const friendIdSet = new Set(friendIds.map((id) => id.toString()));

        const allParticipantsAreFriends = participantsIds.every((id) =>
            friendIdSet.has(id.toString())
        );

        if (!allParticipantsAreFriends) {
            throw new NotFoundException("Some participants are not friends")
        }


        // Upload group icon if provided
        let group_image: string | undefined;
        const roomId = randomUUID()
        const path = `chat/group/${roomId}`

        if (file) {
            group_image = (await this.s3Service.uploadAsset({
                path,
                file
            }));

        }

        // Create the group chat
        const chatingGroup = await this.chatRepository.create({
            data: {
                participants: [...participantsIds, user._id],
                createdBy: user._id,
                type: ChatEnum.OVM,
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
        })

        return chatingGroup
    }

    // --------------------------- Get Group Chat -----------------------------------

    async getGroupChat(groupId: string, { page, size }: { page?: string; size?: string } = {}, user: HydratedDocument<IUser>): Promise<IChat | undefined> {
        const chat = await this.chatRepository.findOneChat({
            filter:
            {
                _id: toObjectId(groupId),
                participants: { $in: [user._id] },
                type: ChatEnum.OVM,
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
        })

        // console.log("chat",chat);

        if (!chat) {

            throw new NotFoundException("Chat not found")
        }

        // Deleted Group
        if (chat?.deletedAt) {
            throw new NotFoundException("Chat not found")
        }

        return chat
    }


    // ----------------------------- Send Group Message -----------------------------------

    async sendGroupMessage({ groupId, content }: { groupId: string, content: string }, user: HydratedDocument<IUser>): Promise<string> {

        const chat = await this.chatRepository.findOneAndUpdate({
            filter: {
                _id: toObjectId(groupId),
                participants: { $in: [user._id] },
                type: ChatEnum.OVM,
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
        })
        if (!chat) {
            throw new NotFoundException("Fail to send message in group.")
        }

        return chat.roomId
    }


    // ------------------------------ Get My Chats (Inbox) -----------------------------------

    async getMyChats(
        user: HydratedDocument<IUser>,
        { page = 1, size = 10 }: { page?: number; size?: number } = {}
    ) {
        const userId = user._id;
        const skip = (page - 1) * size;

        const pipeline = [
            // 1️⃣ Get chats that includes the user and not deleted
            {
                $match: {
                    participants: userId,
                    deletedAt: { $exists: false },
                },
            },

            // 2️⃣ last message in the array — whether it was deleted or not, without any filtering
            {
                $addFields: {
                    lastMessage: { $arrayElemAt: ["$messages", -1] },
                },
            },

            // 3️⃣ lastActivityAt: last message time (even if deleted, its time is still correct),
            // or chat creation time if there are no messages at all
            {
                $addFields: {
                    lastActivityAt: { $ifNull: ["$lastMessage.createdAt", "$createdAt"] },
                },
            },

            // 4️⃣ Sort by lastActivityAt
            { $sort: { lastActivityAt: -1 } },

            // 5️⃣ $facet: data and total count
            {
                $facet: {
                    data: [
                        { $skip: skip },
                        { $limit: size },

                        // حددي "الطرف التاني" للمحادثات الفردية بس (OVO)
                        {
                            $addFields: {
                                otherParticipantId: {
                                    $cond: [
                                        { $eq: ["$type", ChatEnum.OVO] },
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
                                        { $eq: ["$type", ChatEnum.OVM] },
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
                                        { $eq: ["$type", ChatEnum.OVM] },
                                        "$groupIcon",
                                        "$otherParticipant.profilePicture",
                                    ],
                                },
                                lastMessage: {
                                    // ⭐ the new part: if the last message has a deletedAt, show a default text instead of the real content
                                    content: {
                                        $cond: [
                                            { $ifNull: ["$lastMessage.deletedAt", false] },
                                            "This message was deleted",
                                            "$lastMessage.content",
                                        ],
                                    },
                                    // ⭐ hasAttachment became tied to the same condition — if the message is deleted,
                                    //    we don't show any indication of attachments (as agreed)
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

    // ------------------------------ Add Member to Group Chat -----------------------------------

    async addMembersToGroupChat(
        userId: Types.ObjectId,
        chatId: Types.ObjectId,
        memberIds: string[]
    ): Promise<HydratedDocument<IChat> & { _id: Types.ObjectId }> {

        // 1️⃣ Chat must exist
        const chat = await this.checkExistingChat(chatId)

        // 2️⃣ User is a patricipant & Only admin can add members
        if (!chat.participants.includes(userId) || userId.toString() !== chat.createdBy.toString()) {
            throw new ForbiddenException("You are not authorized to add members to this chat");
        }

        // 3️⃣ Exclude existing members + duplicates in the input
        const existingUserIds = chat.participants.map((p) => p.toString());
        const newMemberIds = [...new Set(memberIds)]
            .filter((id) => !existingUserIds.includes(id))
            .map((id) => toObjectId(id));

        if (newMemberIds.length === 0) {
            return chat as HydratedDocument<IChat> & { _id: Types.ObjectId };
        }

        // 4️⃣ Ensure new members are valid users
        const existingNewMembers = await this.userRepository.findAll({
            filter: { _id: { $in: newMemberIds }, deletedAt: { $exists: false } }
        });

        if (existingNewMembers?.length !== newMemberIds.length) {
            throw new NotFoundException("Some users no longer exist");
        }

        // 5️⃣ Ensure all new members are friends with admin
        const friendIds = await this.friendRequestService.getAcceptedFriendIds(userId);
        const friendIdSet = new Set(friendIds.map((id) => id.toString()));

        const allAreFriends = newMemberIds.every((id) => friendIdSet.has(id.toString()));
        if (!allAreFriends) {
            throw new BadRequestException("Some users are not your friends");
        }

        // 6️⃣ Ensure no blocking between admin and any new member
        const blockedIds = await this.blockService.getBlockedUserIds(userId);
        const blockedIdSet = new Set(blockedIds.map((id) => id.toString()));

        const noneBlocked = newMemberIds.every((id) => !blockedIdSet.has(id.toString()));
        if (!noneBlocked) {
            throw new BadRequestException("Some users cannot be added to this chat");
        }

        // 7️⃣ Update chat by adding new members
        const updatedChat = await this.chatRepository.findOneAndUpdate({
            filter: { _id: chatId },
            update: { $push: { participants: { $each: newMemberIds } } },
            options: { new: true }
        });

        if (!updatedChat) {
            throw new BadRequestException("Failed to add members");
        }

        // 8️⃣ Notification to each new member that they were added to the group
        for (const memberId of newMemberIds) {
            try {
                console.log("hellooo")
                await this.notificationModuleService.createNotification({
                    title: "Added to group",
                    body: `You were added to ${chat.groupName}`,
                    senderId: userId,
                    receiverId: memberId,
                    type: NotificationType.GROUP_ADD,
                    onModel: "Chat",
                    referenceId: chat._id,
                });
            } catch (error) {
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
                        type: NotificationType.GROUP_ADD,
                    });
                } catch (error) {
                    console.log("Failed to send notification:", error);
                }
            }
        }

        return updatedChat as HydratedDocument<IChat> & { _id: Types.ObjectId };
    }

    // ------------------------------ Remove Member from Group Chat -----------------------------------

    async removeMemberFromGroupChat(
        userId: Types.ObjectId,
        chatId: Types.ObjectId,
        memberId: Types.ObjectId
    ): Promise<HydratedDocument<IChat> & { _id: Types.ObjectId }> {

        // 1️⃣ Chat must exist
        const chat = await this.checkExistingChat(chatId)

        const participantIds = chat.participants.map(p => p.toString());

        // 2️⃣ User is a patricipant & Only admin can add members
        if (!participantIds.includes(userId.toString()) || userId.toString() !== chat.createdBy.toString()) {
            throw new ForbiddenException("You are not authorized to remove members from this chat");
        }

        // 3️⃣ Check this member is a participant
        if (!participantIds.includes(memberId.toString())) {
            throw new BadRequestException("This user is not a participant in this chat");
        }

        // 4️⃣ Ensure the user is not the admin
        if (memberId.toString() === chat.createdBy.toString()) {
            throw new BadRequestException("You cannot remove the admin from the chat");
        }

        // 5️⃣ Update chat by removing the member
        const updatedChat = await this.chatRepository.findOneAndUpdate({
            filter: { _id: chatId },
            update: { $pull: { participants: memberId } },
            options: { new: true }
        });

        if (!updatedChat) {
            throw new BadRequestException("Failed to remove member");
        }


        return updatedChat as HydratedDocument<IChat> & { _id: Types.ObjectId };
    }

    // -------------------------- Leave Group Chat (Only for participants) -----------------------------------

    async leaveGroupChat(
        userId: Types.ObjectId,
        chatId: Types.ObjectId,
    ): Promise<HydratedDocument<IChat> & { _id: Types.ObjectId }> {

        // 1️⃣ Chat must exist
        const chat = await this.checkExistingChat(chatId)

        const participantIds = chat.participants.map(p => p.toString());

        // 2️⃣ User is a patricipant
        if (!participantIds.includes(userId.toString())) {
            throw new ForbiddenException("You are not authorized to leave this chat");
        }

        // 3️⃣ Admin can't leave
        if (userId.toString() === chat.createdBy.toString()) {
            throw new ForbiddenException("Admin cannot leave the group. Delete the group instead.");
        }

        // 4️⃣ Update chat by removing the member
        const updatedChat = await this.chatRepository.findOneAndUpdate({
            filter: { _id: chatId },
            update: { $pull: { participants: userId } },
            options: { new: true }
        });

        if (!updatedChat) {
            throw new BadRequestException("Failed to leave chat");
        }


        return updatedChat as HydratedDocument<IChat> & { _id: Types.ObjectId };
    }

    // ------------------------------ Delete the group (Admin only) -----------------------------------

    async deleteGroupChat(
        userId: Types.ObjectId,
        chatId: Types.ObjectId,
    ): Promise<HydratedDocument<IChat> & { _id: Types.ObjectId }> {

        // 1️⃣ Chat must exist
        const chat = await this.checkExistingChat(chatId)

        // 2️⃣ User is admin
        if (userId.toString() !== chat.createdBy.toString()) {
            throw new ForbiddenException("Only admin can delete the group.");
        }

        // 3️⃣ Update chat by soft deleting it
        const updatedChat = await this.chatRepository.findOneAndUpdate({
            filter: { _id: chatId },
            update: { deletedAt: new Date() },
            options: { new: true }
        });

        if (!updatedChat) {
            throw new BadRequestException("Failed to delete group");
        }


        return updatedChat as HydratedDocument<IChat> & { _id: Types.ObjectId };
    }

    // ------------------------------ Edit the group (Admin only) -----------------------------------

    async editGroupChat(
        userId: Types.ObjectId,
        chatId: Types.ObjectId,
        updates: {
            groupName?: string;
            groupDescription?: string;
        },
        file?: Express.Multer.File
    ): Promise<HydratedDocument<IChat> & { _id: Types.ObjectId }> {

        // 1️⃣ Chat must exist
        const chat = await this.checkExistingChat(chatId)

        // 2️⃣ User is admin
        if (userId.toString() !== chat.createdBy.toString()) {
            throw new ForbiddenException("Only admin can edit the group.");
        }

        const { groupName, groupDescription } = updates;

        // 3️⃣  Must have at least one update (text or image)
        if (!groupName && !groupDescription && !file) {
            throw new BadRequestException("Nothing to update");
        }

        // 4️⃣ Upload the new image if provided
        let groupIcon: string | undefined;
        if (file) {
            const path = `chat/group/${chat.roomId}`;
            groupIcon = await this.s3Service.uploadAsset({ path, file });

            // Delete the old image from S3 if it exists
            if (chat.groupIcon && chat.groupIcon !== groupIcon) {
                await this.s3Service.deleteAsset({ Key: chat.groupIcon });
            }
        }

        // 5️⃣ Build update object with only the new inputs
        const updateData: Record<string, string> = {};
        if (groupName) updateData.groupName = groupName;
        if (groupDescription) updateData.groupDescription = groupDescription;
        if (groupIcon) updateData.groupIcon = groupIcon;

        // 6️⃣ Update the chat
        const updatedChat = await this.chatRepository.findOneAndUpdate({
            filter: { _id: chatId },
            update: updateData,
            options: { new: true }
        });

        if (!updatedChat) {
            throw new BadRequestException("Failed to edit group");
        }

        return updatedChat as HydratedDocument<IChat> & { _id: Types.ObjectId };
    }

}

export const chatService = new ChatService()