import mongoose, { HydratedDocument, Types } from "mongoose";
import { UserRepository } from "../../DB/repository";
import { FollowRepository } from "../../DB/repository/follow.repository";
import { IFollow, IUser } from "../../common/interfaces";
import { BadRequestException, NotFoundException } from "../../common/exceptions";
import { notificationService, NotificationService } from "../../common/services";
import { redisService, RedisService } from "../../common/services";
import { NotificationType } from "../../common/enums";
import { NotificationModuleService } from "../notification";
import { toObjectId } from "../../common/utils/objectId";


// Notes:
// Use a transaction to keep the Follow relationship and user counts consistent — either all operations succeed or all are rolled back.
// Use transactions for data consistency, not for performance; they add some overhead but are worth it when multiple related operations must succeed or fail together.


export class FollowService {
    private readonly userRepository: UserRepository;
    private readonly followRepository: FollowRepository;
    private readonly notificationService: NotificationService;
    private readonly redisService: RedisService;
    private readonly notificationModuleService: NotificationModuleService;
    constructor() {
        this.userRepository = new UserRepository();
        this.followRepository = new FollowRepository();
        this.notificationService = notificationService;
        this.redisService = redisService;
        this.notificationModuleService = new NotificationModuleService();
    }

    // Follow
    public async follow(user: HydratedDocument<IUser> & { _id: Types.ObjectId }, followingId: string): Promise<HydratedDocument<IFollow> & { _id: Types.ObjectId }> {

        if (user?._id?.toString() === followingId) {
            throw new BadRequestException("You cannot follow yourself");
        }

        const followingUser = await this.userRepository.findOne({
            filter: { _id: followingId, deletedAt: { $exists: false } },
        });

        if (!followingUser) {
            throw new NotFoundException("User not found");
        }

        const followExists = await this.followRepository.findOne({
            filter: {
                followerId: user._id.toString(),
                followingId,
            },
        });

        if (followExists) {
            throw new BadRequestException("You already follow this user");
        }

        const session = await mongoose.startSession();

        let createdFollow: (HydratedDocument<IFollow> & { _id: Types.ObjectId }) | undefined;

        try {
            session.startTransaction();

            const follow = await this.followRepository.create({
                data: {
                    followerId: user._id.toString(),
                    followingId,
                },
                options: { session },
            });

            if (!follow || Array.isArray(follow)) {
                throw new BadRequestException("Failed to create follow record");
            }

            createdFollow = follow;

            // Update User's Following and Follower Count
            await this.userRepository.findOneAndUpdate({
                filter: { _id: user._id.toString() },
                update: { $inc: { followingCount: 1 } },
                options: { session },
            });

            await this.userRepository.findOneAndUpdate({
                filter: { _id: followingId },
                update: { $inc: { followersCount: 1 } },
                options: { session },
            });

            await session.commitTransaction();


        } catch (error) {
            // Only abort if transaction is still active
            if (session.inTransaction()) {
                await session.abortTransaction();
            }
            throw error;
        } finally {
            session.endSession();
        }

        const follow = createdFollow as HydratedDocument<IFollow> & { _id: Types.ObjectId };

        // Store Notification in DB
        try {
            await this.notificationModuleService.createNotification({
                title: "New Follower",
                body: `${user.firstName} ${user.lastName} started following you`,
                senderId: user._id,
                receiverId: toObjectId(followingId),
                type: NotificationType.FOLLOW,
                onModel: "User",
                referenceId: user._id,
            });
        } catch (error) {
            console.log("Failed to create notification:", error);
        }


        // send Notification
        const followingUserTokens = await this.redisService.getFCMs(followingId);
        if (followingUserTokens?.length) {
            try {
            await this.notificationService.sendNotifications({
                userId: followingId,
                tokens: followingUserTokens,
                title: "New Follower",
                body: `${user.firstName} ${user.lastName} started following you`,
                entityId: follow._id.toString(),
                entityType: "follow",
                senderId: user._id.toString(),
                type: NotificationType.FOLLOW,
            });
            } catch (error) {
            console.log("Failed to send notification:", error);
            }
        }

        return follow;

    }

    //================================================================

    // Unfollow

    public async unFollow(followerId: string, followingId: string): Promise<HydratedDocument<IFollow> & { _id: Types.ObjectId }> {
        const session = await mongoose.startSession();

        try {
            session.startTransaction();

            const unFollowed = await this.followRepository.findOneAndDelete({
                filter: {
                    followerId,
                    followingId,
                },
                options: { session, new: true },
            });

            if (!unFollowed ) {
                throw new BadRequestException("You already unfollowed this user");
            }

            // Update User's Following and Follower Count
            await this.userRepository.findOneAndUpdate({
                filter: { _id: followerId },
                update: { $inc: { followingCount: -1 } },
                options: { session },
            });

            await this.userRepository.findOneAndUpdate({
                filter: { _id: followingId },
                update: { $inc: { followersCount: -1 } },
                options: { session },
            });

            await session.commitTransaction();

            // console.log(unFollowed)

            return unFollowed;

        } catch (error) {
            // Only abort if transaction is still active
            if (session.inTransaction()) {
                await session.abortTransaction();
            }
            throw error;

        } finally {
            session.endSession();
        }
        // return unFollowed
    }

    // ===============================================================

    // Get Following Users
    public async getFollowingUsers(
        followerId: string,
        { page, size }: { page: string, size: string },
    ): Promise<any> {
        const followingUsers = await this.followRepository.paginate({
            filter: {
                followerId,
            },
            options: {
                populate: {
                    path: "followingId",
                    select: "firstName lastName",
                },
            },
            size,
            page,
        });
        return followingUsers;
    }

    // ===============================================================

    // Get Followers Users
    public async getFollowersUsers(
        followingId: string,
        { page, size }: { page: string, size: string },
    ): Promise<any> {
        const followersUsers = await this.followRepository.paginate({
            filter: {
                followingId,
            },
            options: {
                populate: {
                    path: "followerId",
                    select: "firstName lastName",
                },
            },
            size,
            page,
        });
        return followersUsers
    }

    // ===============================================================

    // Check Status
    public async checkStatus(userId: string, followingId: string): Promise<string> {
        const isFollowing = await this.followRepository.findOne({
            filter: {
                followerId: userId,
                followingId,
            },
        });

        if (isFollowing) {
            return "Following"
        }
        else{
            return "Follow"
        }
    }

}

export default new FollowService();
