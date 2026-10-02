import { BadRequestException, NotFoundException } from "../../common/exceptions";
import { toObjectId } from "../../common/utils/objectId";
import { BookmarkRepository, PostRepository } from "../../DB/repository";
import { getAvailability } from "../../common/utils/post";
import { IBookmark, IUser } from "../../common/interfaces";
import { HydratedDocument } from "mongoose";


export class BookmarkService {
    private readonly bookmarkRepository: BookmarkRepository;
    private readonly postRepository: PostRepository;

    constructor() {
        this.bookmarkRepository = new BookmarkRepository();
        this.postRepository = new PostRepository();
    }

    // Check if the post exists

    private async checkPostExistence(postId: string, user: HydratedDocument<IUser>) {
        const post = await this.postRepository.findOne({
            filter: {
                _id: toObjectId(postId),
                deletedAt: { $exists: false },
                $or: await getAvailability(user)
            }
        });
        if (!post) {
            throw new NotFoundException("Post not found");
        }

    }


    // ----------------------------- save post  ----------------------------------

    async savePost(user: HydratedDocument<IUser>, postId: string) {

        await this.checkPostExistence(postId, user);

        const checkBookmark: HydratedDocument<IBookmark> | null = await this.bookmarkRepository.findOne({
            filter: {
                userId: user._id,
                postId: toObjectId(postId)
            }
        });

        if (checkBookmark && !checkBookmark?.deletedAt) {
            throw new BadRequestException("You have already saved this post");
        }        
        
        if(checkBookmark && checkBookmark?.deletedAt){
            const updateBookmark = await this.bookmarkRepository.findOneAndUpdate({
                filter: {
                    _id: checkBookmark._id
                },
                update: {
                    $unset: { deletedAt: "" },
                    restoredAt : new Date()
                },
                options: {
                    new:true
                }
            });
            return updateBookmark;
        }

        const bookmark = await this.bookmarkRepository.create({
            data: {
                userId: user._id,
                postId: toObjectId(postId)
            }
        });

        return bookmark;
    }


   // ----------------------------- unsave post  ----------------------------------

    async unsavePost(user: HydratedDocument<IUser>, postId: string) {

        const checkBookmark: HydratedDocument<IBookmark> | null = await this.bookmarkRepository.findOne({
            filter: {
                userId: user._id,
                postId: toObjectId(postId)
            }
        });

        if (!checkBookmark || checkBookmark?.deletedAt) {
            throw new BadRequestException("You have not saved this post");
        }

       
        const updateBookmark = await this.bookmarkRepository.findOneAndUpdate({
                filter: {
                    _id: checkBookmark._id
                },
                update: {
                    $set: { deletedAt: new Date() },
                    $unset: { restoredAt: "" }
                },
                options: {
                    new: true
                }
            });

        return updateBookmark;
        
    }


    // --------------------- Get my saved posts (paginated) ---------------------

    async mySavedPosts(user: HydratedDocument<IUser>,{page ,size }: {page?: number, size?: number}) {

        const savedPosts = await this.bookmarkRepository.paginate({
            filter: {
                userId: user._id,
                deletedAt: { $exists: false }
            },
            page,
            size,
            options: {
                sort: { createdAt: -1 },
                populate: [
                    {
                        path: "postId",
                        match: { deletedAt: { $exists: false } },
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
                    }
                ]
            }
            
        })
        return savedPosts;
    }


    // --------------------- Check if a specific post is saved ------------------

    async isSavedPost(user: HydratedDocument<IUser>, postId: string) {

        await this.checkPostExistence(postId, user);

        const bookmark: HydratedDocument<IBookmark> | null = await this.bookmarkRepository.findOne({
            filter: {
                userId: user._id,
                postId: toObjectId(postId),
                deletedAt: { $exists: false }
            }
        });
        return !!bookmark;
    }
   

    // !! => Converts any value to its Boolean equivalent based on whether it's truthy or falsy —
    // shorthand for Boolean(value)
    // first !   =>  reverses the result of an operation as boolean value (true / false),
    // if the bookmark value is "truthy" the result is false.
    // if the bookmark value is "falsy" the result is true.
    // second !  =>  restores the result to its origin (true / false)
    
}

export const bookmarkService = new BookmarkService();
