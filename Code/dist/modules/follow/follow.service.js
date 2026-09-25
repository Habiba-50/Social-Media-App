"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FollowService = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const repository_1 = require("../../DB/repository");
const follow_repository_1 = require("../../DB/repository/follow.repository");
const exceptions_1 = require("../../common/exceptions");
const services_1 = require("../../common/services");
const services_2 = require("../../common/services");
const enums_1 = require("../../common/enums");
const notification_1 = require("../notification");
const objectId_1 = require("../../common/utils/objectId");
class FollowService {
    userRepository;
    followRepository;
    notificationService;
    redisService;
    notificationModuleService;
    constructor() {
        this.userRepository = new repository_1.UserRepository();
        this.followRepository = new follow_repository_1.FollowRepository();
        this.notificationService = services_1.notificationService;
        this.redisService = services_2.redisService;
        this.notificationModuleService = new notification_1.NotificationModuleService();
    }
    async follow(user, followingId) {
        if (user?._id?.toString() === followingId) {
            throw new exceptions_1.BadRequestException("You cannot follow yourself");
        }
        const followingUser = await this.userRepository.findOne({
            filter: { _id: followingId, deletedAt: { $exists: false } },
        });
        if (!followingUser) {
            throw new exceptions_1.NotFoundException("User not found");
        }
        const followExists = await this.followRepository.findOne({
            filter: {
                followerId: user._id.toString(),
                followingId,
            },
        });
        if (followExists) {
            throw new exceptions_1.BadRequestException("You already follow this user");
        }
        const session = await mongoose_1.default.startSession();
        let createdFollow;
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
                throw new exceptions_1.BadRequestException("Failed to create follow record");
            }
            createdFollow = follow;
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
        }
        catch (error) {
            if (session.inTransaction()) {
                await session.abortTransaction();
            }
            throw error;
        }
        finally {
            session.endSession();
        }
        const follow = createdFollow;
        try {
            await this.notificationModuleService.createNotification({
                title: "New Follower",
                body: `${user.firstName} ${user.lastName} started following you`,
                senderId: user._id,
                receiverId: (0, objectId_1.toObjectId)(followingId),
                type: enums_1.NotificationType.FOLLOW,
                onModel: "User",
                referenceId: user._id,
            });
        }
        catch (error) {
            console.log("Failed to create notification:", error);
        }
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
                    type: enums_1.NotificationType.FOLLOW,
                });
            }
            catch (error) {
                console.log("Failed to send notification:", error);
            }
        }
        return follow;
    }
    async unFollow(followerId, followingId) {
        const session = await mongoose_1.default.startSession();
        try {
            session.startTransaction();
            const unFollowed = await this.followRepository.findOneAndDelete({
                filter: {
                    followerId,
                    followingId,
                },
                options: { session, new: true },
            });
            if (!unFollowed) {
                throw new exceptions_1.BadRequestException("You already unfollowed this user");
            }
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
            return unFollowed;
        }
        catch (error) {
            if (session.inTransaction()) {
                await session.abortTransaction();
            }
            throw error;
        }
        finally {
            session.endSession();
        }
    }
    async getFollowingUsers(followerId, { page, size }) {
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
    async getFollowersUsers(followingId, { page, size }) {
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
        return followersUsers;
    }
    async checkStatus(userId, followingId) {
        const isFollowing = await this.followRepository.findOne({
            filter: {
                followerId: userId,
                followingId,
            },
        });
        if (isFollowing) {
            return "Following";
        }
        else {
            return "Follow";
        }
    }
}
exports.FollowService = FollowService;
exports.default = new FollowService();
