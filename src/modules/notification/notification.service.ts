import { Types } from "mongoose";
import { NotificationRepository } from "../../DB/repository/notification.repository";
import { IFormattedNotification } from "./notification.formate";
import { NotificationType } from "../../common/enums";
import { IPaginate, IUser } from "../../common/interfaces";
import { NotFoundException } from "../../common/exceptions";


export class NotificationModuleService {
    private notificationRepository: NotificationRepository;
    constructor() {
        this.notificationRepository = new NotificationRepository();
    }

    private formatNotification(notification: any): IFormattedNotification {
        const sender = notification.senderId;
        const ref = notification.referenceId;

        let text: string = "";
        let postId: Types.ObjectId | null = null;
        let chatId: Types.ObjectId | null = null;
        let requestId: Types.ObjectId | null = null;
        let friendRequestStatus: string | null = null;
        const senderName = sender.username || [sender.firstName, sender.lastName].filter(Boolean).join(" ") || "Someone";

        switch (notification.type) {
            case NotificationType.LIKE:
                text = notification.onModel === "Comment"
                    ? `${senderName} reacted to your comment`
                    : `${senderName} reacted to your post`;
                postId = ref?.postId ?? ref?._id;
                break;

            case NotificationType.COMMENT:
                if (/reply/i.test(notification.title || "")) {
                    text = `${senderName} replied to your comment${ref?.content ? `: "${ref.content}"` : ""}`;
                } else {
                    const content = ref?.content;
                    text = `${senderName} commented on your post${content ? `: "${content}"` : ""}`;
                }
                postId = ref?.postId;
                break;

            case NotificationType.REPLY:
                text = `${senderName} replied to your comment${ref?.content ? `: "${ref.content}"` : ""}`;
                postId = ref?.postId;
                break;

            case NotificationType.TAG:
                text = `${senderName} tagged you in a post${ref?.content ? `: "${ref.content}"` : ""}`;
                postId = ref?.postId ?? ref?._id;
                break;
            
            case NotificationType.NEW_LOGIN:
                text = `New login from new device`;
                postId = null;
                break;
            
            case NotificationType.MENTION:
                text = `${senderName} mentioned you in a comment${ref?.content ? `: "${ref.content}"` : ""}`;
                postId = ref?.postId;
                break;

            case NotificationType.POST:
                text = "New post uploaded successfully";
                postId = ref?._id;
                break;

            case NotificationType.REPOST:
                text = `${senderName} shared your post`;
                postId = ref?.postId ?? ref?._id ?? notification.referenceId ?? null;
                break;

            case NotificationType.FOLLOW:
                text = `${senderName} started following you`;
                break;

            case NotificationType.MESSAGE_REACTION:
                text = notification.body;
                chatId = ref?._id ?? notification.referenceId ?? null;
                break;

            case NotificationType.FRIEND_REQUEST:
                if (ref?.status === "ACCEPTED") {
                    text = `${senderName} accepted your friend request`;
                } else if (ref?.status === "REJECTED") {
                    text = `${senderName} rejected your friend request`;
                } else {
                    text = `${senderName} sent you a friend request`;
                }
                requestId = ref?._id ?? notification.referenceId ?? null;
                friendRequestStatus = ref?.status ?? null;
                break;

            default:
                text = "New notification";
        }

        return {
            id: notification._id,
            type: notification.type,
            text,
            sender: {
                id: sender._id,
                username: senderName,
                profileImage: sender.profilePicture || sender.profileImage,
            },
            postId,
            ...(requestId ? { requestId } : {}),
            ...(friendRequestStatus ? { friendRequestStatus } : {}),
            ...(chatId ? { chatId } : {}),
            ...(notification.messageId ? { messageId: notification.messageId } : {}),
            createdAt: notification.createdAt,
            isRead: notification.isRead,
        };
    }

    // -------------------------- Create Notification -----------------------------------

    public async createNotification({
        title,
        body,
        senderId,
        receiverId,
        type,
        referenceId,
        messageId,
        onModel,
    }: {
        title: string;
        body: string;
        senderId: Types.ObjectId;
        receiverId: Types.ObjectId;
        type: NotificationType;
        referenceId?: Types.ObjectId;
        messageId?: Types.ObjectId;
        onModel?: string;
    }) {
        
        await this.notificationRepository.create({
            data: {
                title,
                body,
                senderId,
                receiverId,
                type,
                referenceId,
                messageId,
                onModel,
            }
        })

    }

    // -------------------------- Get All Notifications with Pagination -----------------------------------

    public async getNotificationList(
        {
            page,
            size,
            search,
        }: {
            page: number | string | undefined;
            size: number | string | undefined;
            search?: string | undefined;
        },
        user: IUser & { _id: Types.ObjectId },
    ): Promise<IPaginate<any>> {
        const notifications = await this.notificationRepository.paginate({
            filter: {
                receiverId: user._id,
                isDeleted: { $exists: false },
                ...(search ? { title: { $regex: search, $options: "i" }, body: { $regex: search, $options: "i" } } : {}),
            },
            page,
            size,
            options: {
                sort: { createdAt: -1 },
                populate: [
                    { path: "senderId" },
                    { path: "referenceId", select: "_id status postId content" },
                    //   {
                    //     path: "comments",
                    //     populate: [
                    //       {
                    //         path: "replies",
                    //         populate: [
                    //           {
                    //             path: "replies",
                    //           },
                    //         ],
                    //       },
                    //     ],
                    //   },
                ]
            }
        });
    
        return {
            ...notifications,
            docs: (notifications.docs || []).map((notification) => this.formatNotification(notification)),
        };
    }
    
    // ---------------------------- Get Notification By Id ------------------------------------------
    public async getNotificationById(notificationId: string, user: IUser & { _id: Types.ObjectId }) {
        const data = await this.notificationRepository.findOneAndUpdate({
            filter: { _id: notificationId, receiverId: user._id },
            update: { isRead: true },
            options: {
                populate: [
                    { path: "senderId" },
                    { path: "referenceId" },
                ]
            }
        })
        if (!data) {
            throw new NotFoundException("Notification not found");
        }
        return data;
    }

    //-------------------------- Get Unread Notifications Count -----------------------------------

    public async getUnreadCount(user: IUser & { _id: Types.ObjectId }) {
        const data = await this.notificationRepository.countDocuments({
            receiverId: user._id,
            isRead: false,
            isDeleted: { $exists: false },
        })

        return { count: data };
    }

    // -------------------------- Mark All Notifications as Read -----------------------------------
    public async markAllAsRead(user: IUser & { _id: Types.ObjectId }) {
        await this.notificationRepository.updateMany({
            filter: { receiverId: user._id },
            update: { isRead: true },
        })

        return { message: "All notifications marked as read" };
    }

    // -------------------------- Get Unread Notifications paginated -----------------------------------
    public async getUnreadNotifications(
        user: IUser & { _id: Types.ObjectId },
        { page, size }: { page: number | string | undefined; size: number | string | undefined },
    ) {
        const notifications = await this.notificationRepository.paginate({
            filter: { receiverId: user._id, isRead: false },
            page,
            size,
            options: {
                sort: { createdAt: -1 },
                populate: [
                    { path: "senderId" },
                    { path: "referenceId", select: "_id status postId content" },
                ]
            }
        });
        return {
            ...notifications,
            docs: (notifications.docs || []).map((notification) => this.formatNotification(notification)),
        };
    }

    // -------------------------- Delete Notification -----------------------------------
    public async deleteNotification(notificationId: string, user: IUser & { _id: Types.ObjectId }) {
        const data = await this.notificationRepository.findOneAndUpdate({
            filter: { _id: notificationId, receiverId: user._id, isDeleted: { $exists: false} },
            update: { isDeleted: true },
            options: {
                populate: [
                    { path: "senderId" },
                ]
            }
        })
        if (!data) {
            throw new NotFoundException("Notification not found");
        }
        return data;
    }

    // -------------------------- Delete All Notifications -----------------------------------
    public async deleteAllNotifications(user: IUser & { _id: Types.ObjectId }) {
        await this.notificationRepository.updateMany({
            filter: { receiverId: user._id, isDeleted: false },
            update: { isDeleted: true },
        })

        return { message: "All notifications deleted" };
    }

    // ---------------------------------- Restore Notification -----------------------------------
    public async restoreNotification(notificationId: string, user: IUser & { _id: Types.ObjectId }) {
        const data = await this.notificationRepository.findOneAndUpdate({
            filter: { _id: notificationId, receiverId: user._id, isDeleted: true },
            update: { $unset: { isDeleted: 1 } },
            options: {
                populate: [
                    { path: "senderId" },
                ]
            }
        })
        if (!data) {
            throw new NotFoundException("Notification not found");
        }
        return data;
    }

    // ---------------------------------- Restore Notification -----------------------------------
    public async restoreAllNotifications(user: IUser & { _id: Types.ObjectId }) {
        await this.notificationRepository.updateMany({
            filter: { receiverId: user._id, isDeleted: true },
            update: { isDeleted: false },
        })
        return { message: "All notifications restored" };
    }

}

export const notificationModuleService = new NotificationModuleService();
