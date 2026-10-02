import mongoose, { ClientSession, HydratedDocument, Types } from "mongoose";
import { BlockRepository, FollowRepository, FriendRequestRepository, UserRepository } from "../../DB/repository";
import { IBlock, IFollow, IPaginate } from "../../common/interfaces";
import { BadRequestException, NotFoundException } from "../../common/exceptions";
import { toObjectId } from "../../common/utils/objectId";
import { FriendRequestStatusEnum } from "../../common/enums";


export class BlockService {

    private readonly blockRepository: BlockRepository;
    private readonly userRepository: UserRepository;
    private readonly friendRequestRepository: FriendRequestRepository;
    private readonly followRepository: FollowRepository;

    constructor() {
        this.blockRepository = new BlockRepository();
        this.userRepository = new UserRepository();
        this.friendRequestRepository = new FriendRequestRepository();
        this.followRepository = new FollowRepository();
    }

    // Check User Exists
    public async checkUser(userId: Types.ObjectId) {
        const user = await this.userRepository.findOne({
            filter: {
                _id: userId,
                deletedAt: { $exists: false }
            }
        });

        if (!user) {
            throw new NotFoundException("User not found");
        }
    }

    // --------------------- Helper Methods Used in Block Case ✅ -----------------

    // Cancel Friend Request Between Two Users
    private async cancelFriendRequestBetween(
        userA: Types.ObjectId,
        userB: Types.ObjectId,
        session: ClientSession
    ) {
        const request = await this.friendRequestRepository.findOne({
            filter: {
                $or: [
                    { senderId: userA, receiverId: userB },
                    { senderId: userB, receiverId: userA }
                ],
                status: { $in: [FriendRequestStatusEnum.PENDING, FriendRequestStatusEnum.ACCEPTED] },
                deletedAt: { $exists: false }
            }
        });

        if (!request) return;

        const wasAccepted = request.status === FriendRequestStatusEnum.ACCEPTED;

        await this.friendRequestRepository.findOneAndUpdate({
            filter: { _id: request._id },
            update: { status: FriendRequestStatusEnum.CANCELLED, deletedAt: new Date() },
            options: { session }
        });

        if (wasAccepted) {
            await this.userRepository.findOneAndUpdate({
                filter: { _id: request.senderId },
                update: { $inc: { friendsCount: -1 } },
                options: { session }
            });
            await this.userRepository.findOneAndUpdate({
                filter: { _id: request.receiverId },
                update: { $inc: { friendsCount: -1 } },
                options: { session }
            });
        }
    }

    // =============================================

    // Cancel Follow Between Two Users
    private async cancelFollowBetween(
        userA: Types.ObjectId,
        userB: Types.ObjectId,
        session: ClientSession
    ) {
        const follows = await this.followRepository.findAll({
            filter: {
                $or: [
                    { followerId: userA, followingId: userB },
                    { followerId: userB, followingId: userA }
                ],
                isDeleted: { $exists: false }
            }
        });

        for (const follow of (follows || []) as (HydratedDocument<IFollow> & { _id: Types.ObjectId })[]) {
            await this.followRepository.findOneAndUpdate({
                filter: { _id: follow._id },
                update: { isDeleted: true },
                options: { session }
            });
            await this.userRepository.findOneAndUpdate({
                filter: { _id: follow.followerId },
                update: { $inc: { followingCount: -1 } },
                options: { session }
            });
            await this.userRepository.findOneAndUpdate({
                filter: { _id: follow.followingId },
                update: { $inc: { followersCount: -1 } },
                options: { session }
            });
        }
    }


    // ------------------------ Block user ✅ --------------------------------

    public async block(blockerId: string | Types.ObjectId, blockedId: string | Types.ObjectId): Promise<HydratedDocument<IBlock> & { _id: Types.ObjectId }> {

        // check if the user i want to block is me
        if (blockerId.toString() === blockedId.toString()) {
            throw new BadRequestException("You cannot block yourself");
        }

        blockedId = toObjectId(blockedId as string);
        blockerId = toObjectId(blockerId as string);

        await this.checkUser(blockedId as Types.ObjectId)


        const session = await mongoose.startSession();


        let block: HydratedDocument<IBlock> & { _id: Types.ObjectId };

        try {
            session.startTransaction();

            const isBlocked = await this.blockRepository.findOne({
                filter: { blockerId, blockedId }
            });

            // create or revive
            if (isBlocked?.deletedAt) {
                block = await this.blockRepository.findOneAndUpdate({
                    filter: { _id: isBlocked._id },
                    update: { restoredAt: new Date(), $unset: { deletedAt: "" } },
                    options: { session, new: true }
                }) as HydratedDocument<IBlock> & { _id: Types.ObjectId };
                
            } else if (!isBlocked) {
                block = await this.blockRepository.create({
                    data: { blockerId, blockedId },
                    options: { session }
                }) as HydratedDocument<IBlock> & { _id: Types.ObjectId };

            } else {
                // If there is isBlocked without deletedAt
                throw new BadRequestException("You have already blocked this user");
            }

           
            await this.cancelFriendRequestBetween(blockerId, blockedId, session);
            await this.cancelFollowBetween(blockerId, blockedId, session);

            await session.commitTransaction();

        } catch (error) {
            if (session.inTransaction()) await session.abortTransaction();
            throw error;

        } finally {
            session.endSession();
        }

        return block;
    }


    // ------------------------ Unblock user ✅ ---------------------------

    public async unblock(blockerId: string | Types.ObjectId, blockedId: string | Types.ObjectId): Promise<HydratedDocument<IBlock> & { _id: Types.ObjectId }> {

        // -----------------------> check the ids ----------------------->
        if (blockerId.toString() === blockedId.toString()) {
            throw new BadRequestException("You cannot unblock yourself");
        }

        blockedId = toObjectId(blockedId as string);
        blockerId = toObjectId(blockerId as string);

        await this.checkUser(blockedId as Types.ObjectId)

        // -----------------------> check if user is already blocked ----------------------->
        const isBlocked = await this.blockRepository.findOne({
            filter: {
               blockerId: blockerId, blockedId: blockedId ,
            }
        });
        if (!isBlocked || isBlocked?.deletedAt) {
            throw new BadRequestException("You have not blocked this user");
        }

        // -----------------------> Unblock ----------------------->
        const block = await this.blockRepository.findOneAndUpdate({
            filter: {
                blockerId: blockerId, blockedId: blockedId
            },
            update:{
                deletedAt: new Date(),
            },
            options: {
                new : true
            }
        });
        return block as HydratedDocument<IBlock> & { _id: Types.ObjectId };
        
    }


    // ------------------- Get my blocked users(paginated) ✅ -------------------
     
    public async myBlockedUsers(blockerId: string, { page, size, search }:{page?: number, size?: number, search?: string}): Promise<IPaginate<IBlock>> {

        page = page ?? 1;
        size = size ?? 10;
        search = search ?? "";

        const blockedList = await this.blockRepository.paginate({
            filter:{
                blockerId: blockerId,
                deletedAt: { $exists: false }
            },
            page,
            size,
            options: {
                populate: [
                    { path: "blockedId", select: "firstName lastName userName profileImageUrl" }
                ]
            }
        })

        if (search) {
            const searchLower = search.toLowerCase();
            blockedList.docs = blockedList.docs.filter((block: any) =>
                `${block.blockedId?.firstName} ${block.blockedId?.lastName} ${block.blockedId?.userName}`
                    .toLowerCase()
                    .includes(searchLower)
            );
        }

        // Problem: If the page has 10 results and the search filters them to 3, 
        // the pagination metadata (totalPages, etc.) will be inaccurate 
        // because it was calculated before filtering.

        // Solution: Use an Aggregation Pipeline instead of regular pagination.
        // Perform a $lookup on the User collection, then a $match on the name 
        // before the pagination itself, so that the count and pages are 100 % correct.
      
        
        return blockedList;
    }

    // ---------------------- Check Blocked OR Not ✅ --------------------------
    
    // => Check if a specific user is blocked
    public async isBlocked(blockerId: string | Types.ObjectId, blockedId: string | Types.ObjectId): Promise<boolean> {
        const isBlocked = await this.blockRepository.findOne({
            filter: {
                blockerId: toObjectId(blockerId as string),
                blockedId: toObjectId(blockedId as string),
                deletedAt: { $exists: false }
            }
        });
        return !!isBlocked;
    }
    


    // -------------------------- getBlockedUserIds ✅ --------------------------
    
    public async getBlockedUserIds(userId: Types.ObjectId): Promise<Types.ObjectId[]> {
        const blocks = await this.blockRepository.findAll({
            filter: {
                deletedAt: { $exists: false },
                $or: [
                    { blockerId: userId },
                    { blockedId: userId }
                ]
            },
            projection: { blockerId: 1, blockedId: 1 }
        });

        return (blocks || []).map((b) =>
            b.blockerId.toString() === userId.toString() ? b.blockedId : b.blockerId
        );
    }

}




export const blockService = new BlockService();


