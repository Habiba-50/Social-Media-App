import { Types } from "mongoose";

import { FriendRequestRepository, UserRepository } from "../../DB/repository";
import { BadRequestException, NotFoundException } from "../exceptions";
import { IUser } from "../interfaces";
import { toObjectId } from "../utils/objectId";
import { notificationService, NotificationService } from "./notification.service";
import { redisService, RedisService } from "./redis.service";
import { FriendRequestStatusEnum, NotificationType } from "../enums";

export class MentionService {
  private readonly userRepository: UserRepository;
  private readonly friendRequestRepository: FriendRequestRepository
  private readonly redis: RedisService;
  private readonly notificationService: NotificationService;

  constructor() {
    this.userRepository = new UserRepository();
    this.redis = redisService;
    this.notificationService = notificationService;
    this.friendRequestRepository = new FriendRequestRepository();
  }

  /**
   * Validates that every ID in the list corresponds to an existing user.
   */
  async validateUserIds(
    ids: string[],
    fieldName: string = "tags",
  ): Promise<void> {
    if (!ids.length) return;

    const normalizedIds = [
      ...new Set(ids.map((id) => id.trim()).filter(Boolean)),
    ];

    if (!normalizedIds.length) return;

    const users = await this.userRepository.findAll({
      filter: {
        _id: {
          $in: normalizedIds.map((id) => toObjectId(id)),
        },
      },
    });

    if (!users || users.length !== normalizedIds.length) {
      throw new NotFoundException(
        `Some or all ${fieldName} IDs not found in the system.`,
      );
    }
  }

  // ===================================================================

  /**
   * Validates that every tagged user is actually a friend of the requesting user.
   */
  async validateMentionedUsers(
    userId: Types.ObjectId,
    ids: string[],
  ): Promise<void> {
    if (!ids.length) return;

    const tagObjectIds = [...new Set(ids)].map((id) => toObjectId(id));

    if (!tagObjectIds.length) return;

    const friendRequests = await this.friendRequestRepository.findAll({
      filter: {
        status: FriendRequestStatusEnum.ACCEPTED,
        deletedAt: { $exists: false },

        $or: [
          {
            senderId: userId,
            receiverId: { $in: tagObjectIds },
          },
          {
            receiverId: userId,
            senderId: { $in: tagObjectIds },
          },
        ],
      },
    });

    const friendIds = friendRequests?.map((friend) =>
      friend.senderId.toString() === userId.toString()
        ? friend.receiverId.toString()
        : friend.senderId.toString()
    );

    if (friendIds?.length !== tagObjectIds.length) {
      throw new BadRequestException(
        "One or more tagged users are not in your friends list",
      );
    }

    
  }
  
  // ===================================================================

  /**
   * Sends FCM push notifications to all tagged users.
   * Fire-and-forget: does NOT throw — errors are logged instead.
   *
   * IMPORTANT: Only pass NEWLY added tags during updates so existing tags
   * don't receive duplicate notifications.
   */
  async sendMentionNotifications({
    user,
    tags,
    entityId,
    message,
  }: {
    user: Pick<IUser, "username"> & { _id: Types.ObjectId };
    tags: string[];
    entityId: string;
    message: string;
  }): Promise<void> {
    if (!tags?.length) return;

    // Send FCM notifications to each tagged user
    Promise.allSettled(
      tags.map(async (tagUserId) => {
        const tokens = await this.redis.getFCMs(tagUserId);
        if (tokens?.length) {
          await this.notificationService.sendNotifications({
            userId: tagUserId,
            tokens,
            title: `${user.username} mentioned you in a comment`,
            body: message,
            entityId,
            entityType: "post",
            senderId: user._id.toString(),
            type: NotificationType.MENTION,
          });
        }
      }),
    ).catch((err) =>
      console.error("Failed to send mention notifications", err),
    );
  }
}

export const mentionService = new MentionService();
