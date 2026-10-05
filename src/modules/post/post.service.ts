import mongoose, { HydratedDocument, Types } from "mongoose";

import { PostRepository } from "../../DB/repository";
import { FollowRepository } from "../../DB/repository/follow.repository";
import { RepostRepository } from "../../DB/repository/repost.repository";
import {
  mentionService,
  MentionService,
  notificationService,
  NotificationService,
  redisService,
  RedisService,
  s3Service,
  S3Service,
} from "../../common/services";
import {
  CreatePostDto,
  ReactPostParamsDto,
  ReactPostQueryDto,
  UpdatePostBodyDto,
  UpdatePostParamsDto,
} from "./post.dto";
import {
  BadRequestException,
  conflictException,
  NotFoundException,
} from "../../common/exceptions";
import { randomUUID } from "node:crypto";
import { IPaginate, IPost, IUser } from "../../common/interfaces";
import { NotificationType, RoleEnum } from "../../common/enums";
import { getAvailability } from "../../common/utils/post";
import { toObjectId } from "../../common/utils/objectId";
import { CommentService } from "../comment/comment.service";
import { realtimeGateway, RealtimeGatway } from "../realtime";
import { NotificationModuleService } from "../notification";
import { friendRequestService, FriendRequestService } from "../friendRequest";
import { BlockService } from "../block";
import { blockService } from "../block/block.service";

export class PostService {
  private readonly postRepository: PostRepository;
  private readonly followRepository: FollowRepository;
  // private readonly userRepository: UserRepository;
  private readonly mentionService: MentionService;
  private readonly commentService: CommentService
  private readonly s3: S3Service;
  private readonly redisService: RedisService;
  private readonly realtimeGateway: RealtimeGatway
  private readonly notificationModuleService: NotificationModuleService
  private readonly notificationService: NotificationService
  private readonly friendRequestService: FriendRequestService; 
  private readonly blockService: BlockService;  
  private readonly repostRepository: RepostRepository;


  constructor() {
    this.postRepository = new PostRepository();
    this.followRepository = new FollowRepository();
    // this.userRepository = new UserRepository();
    this.mentionService = mentionService;
    this.commentService = new CommentService();
    this.s3 = s3Service;
    this.redisService = redisService;
    this.realtimeGateway = realtimeGateway;
    this.notificationModuleService = new NotificationModuleService()
    this.notificationService = notificationService;
    this.friendRequestService = friendRequestService;  
    this.blockService = blockService;  
    this.repostRepository = new RepostRepository();
  }

  private normalizePostResponse(post: any) {
    const data = post?.toJSON?.() ?? post;
    const { attachments, ...restData } = data || {};

    return {
      ...restData,
      files: Array.isArray(restData?.files) ? restData.files : [],
    };
  }


  // ------------------------------- Create Post -------------------------------

  public async createPost(
    { availability, tags, content, files }: CreatePostDto,
    user: IUser & { _id: Types.ObjectId },
  ): Promise<any> {
    const normalizedTags = [
      ...new Set((tags || []).map((tag) => tag.trim()).filter(Boolean)),
    ];

    await this.mentionService.validateUserIds(normalizedTags, "tags");
    await this.mentionService.validateMentionedUsers(user._id, normalizedTags);

    const tagObjectIds = normalizedTags.map((tag) => toObjectId(tag));

    // Generate folder id
    const folderId = randomUUID();

    // Uploaded files urls
    let attachments: string[] = [];

    // Upload files to S3
    if (files?.length) {
      attachments = await this.s3.uploadAssets({
        files: files as Express.Multer.File[],
        path: `post/${folderId}`,
      });
    }

    // Create post
    const createdPost = await this.postRepository.create({
      data: {
        content,
        createdBy: user._id,
        files: attachments,
        folderId,
        availability,
        tags: tagObjectIds,
      },
    });

    // Fail safe rollback
    if (!createdPost) {
      if (attachments?.length) {
        await this.s3.deleteAssets({
          Keys: attachments.map((ele) => ({
            Key: ele,
          })),
        });
      }

      throw new BadRequestException("Failed to create post");
    }

    await this.mentionService.sendMentionNotifications({
      user,
      tags: normalizedTags,
      entityId: createdPost._id.toString(),
      message: `${user.username} mentioned you in a post`,
    });

    // send Notification to user that post created
    
    const creatorTokens = await this.redisService.getFCMs(user._id.toString());
    if (creatorTokens?.length) {
      await this.notificationService.sendNotifications({
        userId: user._id.toString(),
        tokens: creatorTokens,
        title: "Post created successfully",
        body: "Your post has been created successfully",
        entityId: createdPost._id.toString(),
        entityType: "post",
        senderId: user._id.toString(),
        type: NotificationType.POST,
      });
    }
    

    return this.normalizePostResponse(createdPost);
  }

  // ------------------------------- Update Post -------------------------------

  public async updatePost(
    { postId }: UpdatePostParamsDto,
    {
      content,
      availability,
      removeFiles = [],
      files = [],
      tags = [],
      removeTags = [],
    }: UpdatePostBodyDto,
    user: HydratedDocument<IUser>,
  ): Promise<IPost> {

    //1- Get the post for validation and to get the S3 folder path
    const post = await this.postRepository.findOne({
      filter: {
        _id: postId,
        createdBy: user._id,
        deletedAt: { $exists: false },
      },
    });

    if (!post) {
      throw new NotFoundException("Post not found");
    }


    // 2- Handle S3 assets

    const currentFiles = post.files || [];

    const filesToDelete = currentFiles.filter((file) =>
      removeFiles.includes(file),
    );


    // 3 - Handle tags - Clean and validate incoming tag IDs

    const normalizedTags = [
      ...new Set((tags || []).map((tag) => tag.trim()).filter(Boolean)),
    ];

    const normalizedRemoveTags = [
      ...new Set(
        (removeTags || []).map((tag) => tag.trim()).filter(Boolean),
      ),
    ];

    await this.mentionService.validateUserIds(normalizedTags, "tags");
    await this.mentionService.validateMentionedUsers(user._id, normalizedTags);
    await this.mentionService.validateUserIds(normalizedRemoveTags, "removeTags");

    const tagsToAdd = normalizedTags.map((tag) => toObjectId(tag));

    const tagsToRemove = normalizedRemoveTags.map((tag) =>
      toObjectId(tag),
    );


    // 4- Check if the post has content or attachments
    const expectedFilesCount =
      currentFiles.length -
      filesToDelete.length +
      files.length;

    if (!content && !post.content && expectedFilesCount === 0) {
      throw new conflictException(
        "Post must contain content or attachments",
      );
    }


    //5 - Upload new files first
    let uploadedFiles: string[] = [];

    try {
      if (files.length) {
        uploadedFiles = await this.s3.uploadAssets({
          files: files as Express.Multer.File[],
          path: `post/${post.folderId}`,
        });
      }


      //6- Update the post in the database
      const updatedPost = await this.postRepository.findOneAndUpdate({
        filter: {
          _id: postId,
          createdBy: user._id,
          deletedAt: { $exists: false },
        },
        update: [
          {
            $set: {
              content:
                content !== undefined ? content : "$content",

              availability:
                availability !== undefined
                  ? Number(availability)
                  : "$availability",

              updatedBy: user._id,

              files: {
                $setUnion: [
                  {
                    $setDifference: ["$files", removeFiles],
                  },
                  uploadedFiles,
                ],
              },

              tags: {
                $setUnion: [
                  {
                    $setDifference: ["$tags", tagsToRemove],
                  },
                  tagsToAdd,
                ],
              },
            },
          },
        ],
        options: {
          new: true,
        },
      });

      if (!updatedPost) {
        throw new BadRequestException(
          "Post wasn't updated successfully",
        );
      }

      //7 - Delete old files only after successful DB update
      if (filesToDelete.length) {
        await this.s3.deleteAssets({
          Keys: filesToDelete.map((file) => ({
            Key: file,
          })),
        });
      }

      //8 - Send notification to tagged users if there are any new tags
      const notifyTaggedUsers = normalizedTags.filter(
        (tag) =>
          !post.tags?.some(
            (existingTag) =>
              existingTag.toString() === tag,
          ),
      );

      // sendMentionNotifications is fire-and-forget — it handles its own errors internally
      this.mentionService.sendMentionNotifications({
        user,
        tags: notifyTaggedUsers,
        entityId: updatedPost._id.toString(),
        message: `${user.username} mentioned you in a post update`,
      });

      return this.normalizePostResponse(updatedPost) as IPost;
    } catch (error) {
      // Rollback newly uploaded files
      if (uploadedFiles.length) {
        try {
          await this.s3.deleteAssets({
            Keys: uploadedFiles.map((file) => ({
              Key: file,
            })),
          });
        } catch (rollbackError) {
          console.error(
            "Failed to rollback uploaded files",
            rollbackError,
          );
        }
      }

      throw error;
    }
  }

  // ------------------------------- React Post -------------------------------

  public async reactPost(
    { postId }: ReactPostParamsDto,
    { react }: ReactPostQueryDto,
    user: IUser & { _id: Types.ObjectId },
  ) {
    const reaction = Number(react);

    // 1. Get the post first
    const post = await this.postRepository.findOne({
      filter: {
        _id: toObjectId(postId),
        $or: await getAvailability(user as HydratedDocument<IUser>),
      },
      options: {
        populate: [
          { path: "createdBy" },
          { path: "likes.userId" },
        ],
      },
    });

    if (!post) {
      throw new NotFoundException("Post not found");
    }

    const existingReaction = post.likes?.find(
      (like) =>
        like.userId?._id.toString() === user._id.toString()
    );

    // console.log("existingReaction", existingReaction)


    // 2. Remove reaction
    if (reaction === 0) {

      if (existingReaction) {
        await this.postRepository.updateOne({
          filter: {
            _id: post._id,
            "likes.userId": user._id,
          },
          update: {
            $pull: {
              likes: {
                userId: user._id,
              },
            },
          },
        });
      }
    }

    // 3. New reaction
    else if (!existingReaction) {

      await this.postRepository.updateOne({
        filter: {
          _id: post._id,
        },
        update: {
          $addToSet: {
            likes: {
              userId: user._id,
              react: reaction,
            },
          },
        },
      });

      const owner = post.createdBy as HydratedDocument<IUser>;
      const ownerId = owner?._id || (post.createdBy as unknown as Types.ObjectId);

      // Don't notify the owner if he reacts to his own post
      if (ownerId.toString() !== user._id.toString()) {

        // ---------------- DB Notification ----------------

        await this.notificationModuleService.createNotification({
          title: "New Reaction",
          body: `${user.username} reacted to your post`,
          senderId: user._id,
          receiverId: ownerId as Types.ObjectId,
          type: NotificationType.LIKE,
          onModel: "Post",
          referenceId: post._id,
        });

        // ---------------- FCM Notification ----------------

        const tokens = await this.redisService.getFCMs(
          ownerId as Types.ObjectId
        );

        console.log("tokens", tokens)

        if (tokens?.length) {
          await this.notificationService.sendNotifications({
            userId: ownerId as Types.ObjectId,
            tokens,
            title: "New Reaction",
            body: `${user.username} reacted to your post`,
            entityId: post._id.toString(),
            entityType: "post",
            senderId: user._id.toString(),
            type: NotificationType.LIKE,
          });
        }


      }
    }

    // 4. Change existing reaction
    else {

      await this.postRepository.updateOne({
        filter: {
          _id: post._id,
          "likes.userId": user._id,
        },
        update: {
          $set: {
            "likes.$.react": reaction,
          },
        },
      });
    }

    // 5. Get updated post
    const updatedPost = await this.postRepository.findOne({
      filter: {
        _id: post._id,
      },
      options: {

        populate: [
          { path: "createdBy" },
          { path: "likes.userId" },
        ],
      },
    });

    if (!updatedPost) {
      throw new NotFoundException("Post not found");
    }

    // 6. Socket.IO → always notify the post owner
    const owner = updatedPost.createdBy as HydratedDocument<IUser>;

    const socketIds = await this.redisService.getSockets(
      owner._id as Types.ObjectId
    );

    if (socketIds?.length) {
      this.realtimeGateway.getIo()
        .to(socketIds)
        .emit("react_post", {
          postId: updatedPost._id,
          react: reaction,
          userId: user._id,
        });
    }

    return updatedPost;
  }


  // ------------------------------- Get Post -------------------------------

  public async getPost(id: string, user: IUser & { _id: Types.ObjectId }) {
    const post = await this.postRepository.findOne({
      filter: {
        _id: id,
        deletedAt: { $exists: false },
        $or: await getAvailability(user as HydratedDocument<IUser>),
      },
      options: {
        populate: [
          { path: "createdBy" },
          { path: "likes.userId" },
          { path: "tags" },
          {
            path: "comments",
            match: {
              deletedAt: { $exists: false },
              commentId: { $exists: false },
            },
            populate: [
              { path: "createdBy" },
              {
                path: "replies",
                match: { deletedAt: { $exists: false } },
                populate: [{ path: "createdBy" }],
              },
            ],
          },
        ],
      },
    });

    if (!post || post.deletedAt) {
      throw new Error("Post not found");
    }

    return this.normalizePostResponse(post);
  }

  // ------------------------- Get All Posts with pagination ----------------------
  public async getPostList(
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
  ): Promise<IPaginate<IPost>> {
    const posts = await this.postRepository.paginate({
      filter: {
        $or: await getAvailability(user as HydratedDocument<IUser>),
        ...(search ? { content: { $regex: search, $options: "i" } } : {}),
        // exceptedFor: { $in: [user._id] }
      },
      page,
      size,
      options: {
        sort: { createdAt: -1 },
        populate: [
          { path: "likes.userId" },
          { path: "createdBy" },
          { path: "tags" },
          { path: "updatedBy" },
          {
            path: "comments",
            match: {
              deletedAt: { $exists: false },
              commentId: { $exists: false },
            },
            populate: [
              { path: "createdBy" },
              {
                path: "replies",
                match: { deletedAt: { $exists: false } },
                populate: [
                  { path: "createdBy" },
                  {
                    path: "replies",
                    populate: [
                      { path: "createdBy" },
                      { path: "replies", populate: [{ path: "createdBy" }] },
                    ],
                  },
                ],
              },
            ],
          },
        ]
      }
    });

    return {
      ...posts,
      docs: (posts.docs || []).map((post) => this.normalizePostResponse(post)),
    };
  }

  // ------------------------------- Delete Post -------------------------------

  public async deletePost(
    id: string,
    user: IUser & { _id: Types.ObjectId },
  ): Promise<any> {

    const result = await this.postRepository.findOneAndUpdate({
      filter: {
        _id: id,
        createdBy: user._id,
        deletedAt: { $exists: false },
      },
      update: {
        deletedAt: new Date(),
        updatedBy: user._id,
      },
      options: { new: true },
    });

    if (!result) {
      throw new Error("Post not found");
    }

    return result;
  }

  // ------------------------------- Restore Post -------------------------------

  public async restorePost(
    id: string,
    user: IUser & { _id: Types.ObjectId },
  ): Promise<any> {
    const result = await this.postRepository.findOneAndUpdate({
      filter: {
        _id: id,
        $or: [{ createdBy: user._id }, { role: RoleEnum.ADMIN }],
        deletedAt: { $exists: true },
      },
      update: {
        $unset: {
          deletedAt: 1,
        },
        updatedBy: user._id,
      },
      options: { new: true },
    });

    if (!result) {
      throw new Error("Post not found");
    }

    return result;
  }

  // ------------------------------- Destroy Post -------------------------------

  // we want to delete all assets that related to this post from s3
  // Delete all comments on it with replies 


  public async destroyPost(
    id: string,
    user: IUser & { _id: Types.ObjectId },
  ): Promise<any> {

    // 1- Get Post
    const post = await this.postRepository.findOne({
      filter: {
        _id: id,
        $or: [{ createdBy: user._id }, { role: RoleEnum.ADMIN }],
      },
    });

    if (!post) {
      throw new Error("Post not found");
    }

    // 2- Prepare assets keys for deletion
    const assetKeys: { Key: string }[] | undefined = post.files?.map((file) => ({
      Key: file,
    }));

    // 3 - Transactions (DB only - if this failed, we don't want to delete anything from S3)
    // we use Session to handel database deletion and rollback if anything goes wrong in the database operations

    const session = await mongoose.startSession();

    try {
      session.startTransaction();

      // Delete Post
      await this.postRepository.deleteOne({
        filter: { _id: id },
        options: { session },
      });

      // Delete Comments
      await this.commentService.deleteCommentsByPostId(
        { postId: id },
        user as HydratedDocument<IUser>,
        session,
      );

      await session.commitTransaction();
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }

    // 4 - Delete all assets from s3
    try {
      if (assetKeys?.length) {
        await this.s3.deleteAssets({
          Keys: assetKeys,
        });
      }
    } catch (error) {
      console.error(error)
    }

    return post;
  }

  // ----------------------------------- Feed --------------------------


  public async getFeed(
    user: HydratedDocument<IUser>,
    query: { page?: number; size?: number } = {}
  ) {

    const page = query.page || 1;
    const size = query.size || 20;
    const skip = (page - 1) * size;

    // Task 2: Prepare people who are allowed to see the feed
    const friendIds = await this.friendRequestService.getAcceptedFriendIds(user._id);
    const followingRelationships = await this.followRepository.findAll({
      filter: { followerId: user._id, isDeleted: { $ne: true } },
      projection: "followingId",
      options: { lean: true },
    });
    const followedIds = (followingRelationships || [])
      .map((relationship: any) => relationship.followingId)
      .filter(Boolean);
    const blockedIds = await this.blockService.getBlockedUserIds(user._id);
    const visibleUserIds = [user._id, ...friendIds, ...followedIds].filter(
      (id) => !blockedIds.some((b) => b.toString() === id.toString())
    );

    // Fetch IDs of posts already reposted by visible users to avoid showing them twice
    const repostDocs = await this.repostRepository.findAll({
      filter: { deletedAt: { $exists: false }, repostedBy: { $in: visibleUserIds } },
      projection: "originalPostId",
      options: { lean: true },
    });
    const repostedOriginalIds = (repostDocs || []).map((r: any) => r.originalPostId).filter(Boolean);

    const pipeline = [
      // Task 3: Posts path with the same availability logic
      {
        $match: {
          deletedAt: { $exists: false },
          // Exclude posts that are already shown as reposts to avoid duplicates
          ...(repostedOriginalIds.length ? { _id: { $nin: repostedOriginalIds } } : {}),
          $and: [
            { $or: await getAvailability(user) },
            {
              $or: [
                { createdBy: { $in: visibleUserIds } },
                { tags: { $in: [user._id] } },
              ],
            },
          ],
        },
      },
      {
        $addFields: {
          type: "post",
          itemDate: "$createdAt",
        },
      },

      // Task 4: Repost path with $unionWith
      {
        $unionWith: {
          coll: "SOCIAL_MEDIA_APP_REPOSTS",
          pipeline: [
            {
              $match: {
                deletedAt: { $exists: false },
                repostedBy: { $in: visibleUserIds },
              },
            },
            {
              $lookup: {
                from: "SOCIAL_MEDIA_APP_POSTS",
                localField: "originalPostId",
                foreignField: "_id",
                as: "originalPost",
              },
            },
            {
              $unwind: {
                path: "$originalPost",
                preserveNullAndEmptyArrays: false, // Original post must exist
              },
            },
            {
              $match: {
                "originalPost.deletedAt": { $exists: false },
                "originalPost.createdBy": { $nin: blockedIds },
              },
            },
            {
              $addFields: {
                type: "repost",
                itemDate: "$createdAt", // Repost date, not original post date
              },
            },
          ],
        },
      },

      // Task 5: sorting and pagination
      { $sort: { itemDate: -1 } },
      {
        $facet: {
          data: [
            { $skip: skip },
            { $limit: size },

            // Task 6: Get post owner data for both paths
            {
              $lookup: {
                from: "SOCIAL_MEDIA_APP_USERS",
                localField: "createdBy",
                foreignField: "_id",
                as: "postOwner",
              },
            },
            { $unwind: { path: "$postOwner", preserveNullAndEmptyArrays: true } },

            // Get original owner data if repost (createdBy of originalPost)
            {
              $lookup: {
                from: "SOCIAL_MEDIA_APP_USERS",
                localField: "originalPost.createdBy",
                foreignField: "_id",
                as: "originalOwner",
              },
            },
            { $unwind: { path: "$originalOwner", preserveNullAndEmptyArrays: true } },

            // Get repost creator data
            {
              $lookup: {
                from: "SOCIAL_MEDIA_APP_USERS",
                localField: "repostedBy",
                foreignField: "_id",
                as: "reposterInfo",
              },
            },
            { $unwind: { path: "$reposterInfo", preserveNullAndEmptyArrays: true } },

            {
              $project: {
                _id: 1,
                type: 1,
                itemDate: 1,

                // if type is post
                content: { $cond: [{ $eq: ["$type", "post"] }, "$content", "$originalPost.content"] },
                files: { $cond: [{ $eq: ["$type", "post"] }, "$files", "$originalPost.files"] },

                owner: {
                  $cond: [
                    { $eq: ["$type", "post"] },
                    {
                      _id: "$postOwner._id",
                      firstName: "$postOwner.firstName",
                      lastName: "$postOwner.lastName",
                      profilePicture: "$postOwner.profilePicture",
                    },
                    {
                      _id: "$originalOwner._id",
                      firstName: "$originalOwner.firstName",
                      lastName: "$originalOwner.lastName",
                      profilePicture: "$originalOwner.profilePicture",
                    },
                  ],
                },

                // if type is repost only
                repostCaption: { $cond: [{ $eq: ["$type", "repost"] }, "$content", null] },
                repostedBy: {
                  $cond: [
                    { $eq: ["$type", "repost"] },
                    {
                      _id: "$reposterInfo._id",
                      firstName: "$reposterInfo.firstName",
                      lastName: "$reposterInfo.lastName",
                      profilePicture: "$reposterInfo.profilePicture",
                    },
                    null,
                  ],
                },
              },
            },
          ],
          totalCount: [{ $count: "count" }],
        },
      },
    ];

    const result = await this.postRepository.aggregate(pipeline);

    const docs = result[0]?.data || [];
    const total = result[0]?.totalCount?.[0]?.count || 0;

    return {
      docs,
      currentPage: page,
      pageSize: size,
      pages: Math.ceil(total / size),
    };
  }

}


export default new PostService();
