import { HydratedDocument } from "mongoose";
import { IRepost, IUser } from "../../common/interfaces";
import { BlockRepository, PostRepository, RepostRepository } from "../../DB/repository";
import { toObjectId } from "../../common/utils/objectId";
import { getAvailability } from "../../common/utils/post";
import { AvailabilityEnum, NotificationType } from "../../common/enums";
import { BadRequestException, NotFoundException } from "../../common/exceptions";
import { Types } from "mongoose";
import { NotificationModuleService } from "../notification";
import { notificationService, NotificationService, redisService, RedisService } from "../../common/services";



export class RepostService {

    private readonly repostRepository: RepostRepository
    private readonly postRepository: PostRepository
    private readonly blockRepository: BlockRepository
    private readonly notificationModuleService: NotificationModuleService;
    private readonly redisService: RedisService;
    private readonly notificationService: NotificationService;

    constructor() {
        this.repostRepository = new RepostRepository();
        this.postRepository = new PostRepository();
        this.blockRepository = new BlockRepository();
        this.notificationModuleService = new NotificationModuleService();
        this.redisService = redisService
        this.notificationService = notificationService;
    }


    // ==================== Private Helper ====================
    private async sendRepostNotification(
        repost: HydratedDocument<IRepost> & { _id: Types.ObjectId },
        post: HydratedDocument<any>,
        user: HydratedDocument<IUser>
    ) {
        try {
            await this.notificationModuleService.createNotification({
                title: "Repost",
                body: `${user.firstName} ${user.lastName} shared your post`,
                senderId: user._id,
                receiverId: post.createdBy as Types.ObjectId,
                type: NotificationType.REPOST,
                onModel: "Post",  // Not Repost model
                referenceId: post._id,
            });
        } catch (error) {
            console.log("Failed to create notification:", error);
        }

        const receiverUserTokens = await this.redisService.getFCMs(post.createdBy as Types.ObjectId);
        if (receiverUserTokens?.length) {
            try {
                await this.notificationService.sendNotifications({
                    userId: post.createdBy?.toString(),
                    tokens: receiverUserTokens,
                    title: "Repost",
                    body: `${user.firstName} ${user.lastName} shared your post`,
                    entityId: repost._id.toString(),
                    entityType: "repost",
                    senderId: user._id.toString(),
                    type: NotificationType.REPOST,
                });
            } catch (error) {
                console.log("Failed to send notification:", error);
            }
        }
    }


    // ------------------------ Create Repost ----------------------
    // content will optional in body

    public async createRepost(postId: string, body: { content?: string }, user: HydratedDocument<IUser>): Promise<HydratedDocument<IRepost> & { _id: Types.ObjectId } | null> {

        const { content } = body || {};

        // Get the post 
        const post = await this.postRepository.findOne({
            filter: { _id: toObjectId(postId), deletedAt: { $exists: false } }
        });

        if (!post) {
            throw new NotFoundException("Post not found");
        }

        //  Check  a user can not repost his own post
        if (post?.createdBy.toString() === user._id.toString()) {
            throw new BadRequestException("You can not share your own post");
        }

        // check Availablility
        if (post.availability !== AvailabilityEnum.PUBLIC) {
            throw new BadRequestException("Only public posts can be shared");
        }

        // check isBlocked
        const authorId = post.createdBy as Types.ObjectId

        const isBlocked = await this.blockRepository.findOne({
            filter: {
                $or: [
                    { blockerId: user._id, blockedId: authorId },
                    { blockerId: authorId, blockedId: user._id }
                ],
                deletedAt: { $exists: false },
            }
        })
        if (isBlocked) {
            throw new BadRequestException("You can not share this post");
        }


        //  Check if the user has already reposted this post
        const checkRepost = await this.repostRepository.findOne({
            filter: { originalPostId: toObjectId(postId), repostedBy: user._id }
        })
        if (checkRepost?.deletedAt) {
            const restoredRepost = await this.repostRepository.findOneAndUpdate({
                filter: { _id: checkRepost._id },
                update: { $set: { restoredAt: new Date() }, $unset: { deletedAt: "" } },
                options: { new: true }
            });

            if (!restoredRepost) {
                throw new BadRequestException("Failed to restore repost");
            }

            // Sending Notifications
            await this.sendRepostNotification( restoredRepost as HydratedDocument<IRepost> & { _id: Types.ObjectId }, post, user);
            return restoredRepost;
        }

        if (checkRepost) {
            throw new BadRequestException("You have already shared this post");
        }


        // Create the repost
        const repost = await this.repostRepository.create({
            data: {
                originalPostId: toObjectId(postId),
                repostedBy: user._id,
                content: content ?? undefined
            }
        });

        // Sending Notifications
        await this.sendRepostNotification(repost, post, user);



        return repost;


    }


    // --------------------- Delete Repost ----------------------

    public async deleteRepost(repostId: string, user: HydratedDocument<IUser>): Promise<boolean> {
        
        const repost = await this.repostRepository.findOneAndUpdate({
            filter: { _id: toObjectId(repostId), repostedBy: user._id },
            update: { $set: { deletedAt: new Date() }, $unset: { restoredAt: "" } },
            options: { new: true }
        })

        if (!repost) {
            throw new NotFoundException("Repost not found");
        }

        return true;
    }


    // ------------------- Get Reposts of a specific post -------------------


    public async getRepostsOfPost(postId: string, { page, size }: { page?: number, size?: number }) {
        const reposts = await this.repostRepository.paginate({
            filter: { originalPostId: toObjectId(postId), deletedAt: { $exists: false } },
            page, size,
            options: {
                sort: { createdAt: -1 },
                populate: [{ path: "repostedBy", select: "firstName lastName profileImageUrl" }]
            }
        });
        return reposts;
    }



    // -------------------------- Get User's Reposts ------------------------


    public async getUserReposts(user:HydratedDocument<IUser>,{page,size}: { page?: number, size?: number }){
        const postAvailability = await getAvailability(user);

        const data = await this.repostRepository.paginate({
            filter: { repostedBy: user._id, deletedAt: { $exists: false } },
            page, size,
            options: {
                sort: { createdAt: -1 },
                populate: [
                    {
                        path: "originalPostId",
                        // If post is deleted we dont want to show it in user's reposts
                        match: {
                            deletedAt: { $exists: false },
                            $or: postAvailability,
                        },
                        select: "content files createdAt createdBy likes availability tags",
                        populate: [
                            {
                                path: "createdBy",
                                select: "_id username firstName lastName profilePicture",
                            },
                            {
                                path: "likes.userId",
                                select: "_id username",
                            },
                            {
                                path: "comments",
                                match: {
                                    deletedAt: { $exists: false },
                                    commentId: { $exists: false },
                                },
                                populate: [
                                    {
                                        path: "createdBy",
                                        select: "_id username firstName lastName profilePicture",
                                    },
                                    {
                                        path: "replies",
                                        match: { deletedAt: { $exists: false } },
                                        populate: [{
                                            path: "createdBy",
                                            select: "_id username firstName lastName profilePicture",
                                        }],
                                    },
                                ],
                            },
                        ],
                    }
                ]
            }
        })
 return data
        
    }


}

export const repostService = new RepostService();
