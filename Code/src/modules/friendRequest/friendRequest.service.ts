import { HydratedDocument, startSession, Types } from "mongoose";
import { FriendRequestStatusEnum, NotificationType } from "../../common/enums";
import { BadRequestException, NotFoundException } from "../../common/exceptions";
import { BlockRepository, FriendRequestRepository, UserRepository } from "../../DB/repository";
import { IFriendRequest, IUser } from "../../common/interfaces";
import { toObjectId } from "../../common/utils/objectId";
import { NotificationModuleService } from "../notification";
import { NotificationService, redisService, RedisService } from "../../common/services";


export class FriendRequestService {

    private readonly friendRequestRepository: FriendRequestRepository
    private readonly userRepository: UserRepository
    private readonly notificationModuleService: NotificationModuleService
    private readonly notificationService: NotificationService
    private readonly redisService: RedisService
    private readonly blockRepository: BlockRepository

    constructor() {
        this.friendRequestRepository = new FriendRequestRepository()
        this.userRepository = new UserRepository()
        this.notificationModuleService = new NotificationModuleService()
        this.notificationService = new NotificationService()
        this.redisService = redisService
        this.blockRepository = new BlockRepository()
    }

    // -------------------------- Send Request ✅✅ --------------------------------

    public async sendFriendRequest(user: HydratedDocument<IUser>, receiverId: string) {

        const userId = user._id.toString()
        //prevent user from sending request to himself ✅
        if (userId === receiverId) {
            throw new BadRequestException("You cannot send a friend request to yourself")
        }


        const receiverUser = await this.userRepository.findOne({
            filter: {
                _id: toObjectId(receiverId),
                deletedAt: { $exists: false },
            }
        })

        if (!receiverUser) {
            throw new NotFoundException("Receiver user not found")
        }

        // prevent user from sending request to blocked user 
        const isBlocked = await this.blockRepository.findOne({
            filter: {
                $or: [
                    { blockerId: toObjectId(userId), blockedId: toObjectId(receiverId) },
                    { blockerId: toObjectId(receiverId), blockedId: toObjectId(userId) }
                ],
                deletedAt: { $exists: false },
            }
        })
        if (isBlocked) {
            throw new BadRequestException("You can't send this user a friend request")
        }



        const isFriends = await this.friendRequestRepository.findOne({
            filter: {
                $or: [
                    { senderId: toObjectId(userId), receiverId: toObjectId(receiverId) },
                    { senderId: toObjectId(receiverId), receiverId: toObjectId(userId) }
                ]
            },
        })

        //Resend request if the status is cancelled / rejected / unfriend  ✅✅
        if (isFriends?.deletedAt) {
            const updatedFriendRequest = await this.friendRequestRepository.findOneAndUpdate({
                filter: {
                    _id: isFriends._id
                },
                update: {
                    status: FriendRequestStatusEnum.PENDING,
                    senderId: toObjectId(userId),
                    receiverId: toObjectId(receiverId),
                    $unset: {
                        deletedAt: ""
                    }
                },
                options: {
                    new: true
                }
            })
            return updatedFriendRequest
        }

        //prevent user from sending request to someone who he is already friends with ✅
        if (isFriends && isFriends.status === FriendRequestStatusEnum.ACCEPTED) {
            throw new BadRequestException("You are already friends with this user")
        }


        //prevent user from sending request to someone who he has already sent request to ✅
        if (isFriends && isFriends.status === FriendRequestStatusEnum.PENDING && isFriends.senderId.toString() === userId) {
            throw new BadRequestException("You have already sent a friend request to this user")
        }


        //Auto accept if I sent a request to someone who has already sent me a request ✅ 
        if (isFriends && isFriends.status === FriendRequestStatusEnum.PENDING && isFriends.receiverId.toString() === userId) {

            return await this.acceptFriendRequest(user, isFriends._id.toString())

            // const session = await startSession()

            // let updatedFriendRequest: HydratedDocument<IFriendRequest> & { _id: Types.ObjectId } | any

            // try {

            //     session.startTransaction()

            //     updatedFriendRequest = await this.friendRequestRepository.findOneAndUpdate({
            //         filter: {
            //             _id: isFriends._id
            //         },
            //         update: {
            //             status: FriendRequestStatusEnum.ACCEPTED,
            //             updatedAt: new Date()
            //         },
            //         options: {
            //             session
            //         }
            //     })

            //     await this.userRepository.findOneAndUpdate({
            //         filter: {
            //             _id: toObjectId(userId)
            //         },
            //         update: {
            //             $inc: { friendsCount: 1 }
            //         },
            //         options: {
            //             session
            //         }
            //     })

            //     await this.userRepository.findOneAndUpdate({
            //         filter: {
            //             _id: toObjectId(receiverId)
            //         },
            //         update: {
            //             $inc: { friendsCount: 1 }
            //         },
            //         options: {
            //             session
            //         }
            //     })

            //     await session.commitTransaction()

            //     // return updatedFriendRequest;

            // } catch (error) {
            //     if (session.inTransaction()) {
            //         await session.abortTransaction()
            //     }
            //     throw error
            // } finally {
            //     await session.endSession()
            // }

            // // Sending Notifications

            // if (updatedFriendRequest) {
            //     // store Notification
            //     try {
            //         await this.notificationModuleService.createNotification({
            //             title: "Friend Request",
            //             body: `${user.firstName} ${user.lastName} accepted your friend request `,
            //             senderId: toObjectId(userId),
            //             receiverId: toObjectId(receiverId),
            //             type: NotificationType.FRIEND_REQUEST,
            //             onModel: "FriendRequest",
            //             referenceId: updatedFriendRequest._id,
            //         });
            //     } catch (error) {
            //         console.log("Failed to create notification:", error);
            //     }


            //     // send Notification
            //     const receiverUserTokens = await this.redisService.getFCMs(receiverId);
            //     // console.log("tokens", receiverUserTokens)
            //     if (receiverUserTokens?.length) {
            //         try {
            //             await this.notificationService.sendNotifications({
            //                 userId: receiverId,
            //                 tokens: receiverUserTokens,
            //                 title: "Friend Request",
            //                 body: `${user.firstName} ${user.lastName} accepted your friend request`,
            //                 entityId: updatedFriendRequest._id.toString(),
            //                 entityType: "friend_request",
            //                 senderId: user._id.toString(),
            //                 type: NotificationType.FRIEND_REQUEST,
            //             });
            //         } catch (error) {
            //             console.log("Failed to send notification:", error);
            //         }
            //     }

            // }
            // return updatedFriendRequest;
        }

        // Create a new friend request document 
        const result = await this.friendRequestRepository.create({
            data: {
                senderId: toObjectId(userId),
                receiverId: toObjectId(receiverId),
                status: FriendRequestStatusEnum.PENDING
            },

        })

        // Sending Notifications
        if (result) {
            // store Notification
            try {
                await this.notificationModuleService.createNotification({
                    title: "Friend Request",
                    body: `${user.firstName} ${user.lastName} sent you a friend request`,
                    senderId: toObjectId(userId),
                    receiverId: toObjectId(receiverId),
                    type: NotificationType.FRIEND_REQUEST,
                    onModel: "FriendRequest",
                    referenceId: result._id,
                });
            } catch (error) {
                console.log("Failed to create notification:", error);
            }


            // send Notification
            const receiverUserTokens = await this.redisService.getFCMs(receiverId);
            // console.log("tokens", receiverUserTokens)
            if (receiverUserTokens?.length) {
                try {
                    await this.notificationService.sendNotifications({
                        userId: receiverId,
                        tokens: receiverUserTokens,
                        title: "Friend Request",
                        body: `${user.firstName} ${user.lastName} sent you a friend request`,
                        entityId: result._id.toString(),
                        entityType: "friend_request",
                        senderId: user._id.toString(),
                        type: NotificationType.FRIEND_REQUEST,
                    });
                } catch (error) {
                    console.log("Failed to send notification:", error);
                }
            }
        }

        return result;

    }


    // -------------------------- Accept Request ✅✅ --------------------------------

    public async acceptFriendRequest(user: HydratedDocument<IUser>, friendRequestId: string) {

        const userId = user._id.toString()

        const isFriendRequest = await this.friendRequestRepository.findOne({
            filter: {
                _id: toObjectId(friendRequestId),
                receiverId: toObjectId(userId),
                status: FriendRequestStatusEnum.PENDING
            },
        })

        if (!isFriendRequest) throw new NotFoundException("Friend request not found")

        if (isFriendRequest) {
            const session = await startSession()

            let updatedFriendRequest: HydratedDocument<IFriendRequest> & { _id: Types.ObjectId } | any

            try {

                session.startTransaction()

                updatedFriendRequest = await this.friendRequestRepository.findOneAndUpdate({
                    filter: {
                        _id: isFriendRequest._id
                    },
                    update: {
                        status: FriendRequestStatusEnum.ACCEPTED,
                        updatedAt: new Date()
                    },
                    options: {
                        session
                    }
                })

                await this.userRepository.findOneAndUpdate({
                    filter: {
                        _id: toObjectId(userId)
                    },
                    update: {
                        $inc: { friendsCount: 1 }
                    },
                    options: {
                        session
                    }
                })

                await this.userRepository.findOneAndUpdate({
                    filter: {
                        _id: isFriendRequest?.senderId
                    },
                    update: {
                        $inc: { friendsCount: 1 }
                    },
                    options: {
                        session
                    }
                })

                await session.commitTransaction()

                // return updatedFriendRequest;

            } catch (error) {
                if (session.inTransaction()) {
                    await session.abortTransaction()
                }
                throw error
            } finally {
                await session.endSession()
            }

            // Sending Notifications

            if (updatedFriendRequest) {
                // store Notification
                try {
                    await this.notificationModuleService.createNotification({
                        title: "Friend Request",
                        body: `${user.firstName} ${user.lastName} accepted your friend request `,
                        senderId: toObjectId(userId),
                        receiverId: isFriendRequest?.senderId,
                        type: NotificationType.FRIEND_REQUEST,
                        onModel: "FriendRequest",
                        referenceId: updatedFriendRequest._id,
                    });
                } catch (error) {
                    console.log("Failed to create notification:", error);
                }


                // send Notification
                const receiverUserTokens = await this.redisService.getFCMs(isFriendRequest?.senderId);
                // console.log("tokens", receiverUserTokens)
                if (receiverUserTokens?.length) {
                    try {
                        await this.notificationService.sendNotifications({
                            userId: isFriendRequest?.senderId,
                            tokens: receiverUserTokens,
                            title: "Friend Request",
                            body: `${user.firstName} ${user.lastName} accepted your friend request`,
                            entityId: updatedFriendRequest._id.toString(),
                            entityType: "friend_request",
                            senderId: user._id.toString(),
                            type: NotificationType.FRIEND_REQUEST,
                        });
                    } catch (error) {
                        console.log("Failed to send notification:", error);
                    }
                }

            }
            return updatedFriendRequest;
        }


    }

    // -------------------------- Reject Request ✅✅ --------------------------------

    public async rejectFriendRequest(user: HydratedDocument<IUser>, friendRequestId: string) {

        const userId = user._id.toString()

        const isFriendRequest = await this.friendRequestRepository.findOne({
            filter: {
                _id: toObjectId(friendRequestId),
                receiverId: toObjectId(userId),
                status: FriendRequestStatusEnum.PENDING
            },
        })

        if (!isFriendRequest) throw new NotFoundException("Friend request not found")

        const updatedFriendRequest = await this.friendRequestRepository.findOneAndUpdate({
            filter: {
                _id: isFriendRequest._id
            },
            update: {
                status: FriendRequestStatusEnum.REJECTED,
                deletedAt: new Date()
            }
        })

        // Sending Notifications
        if (updatedFriendRequest) {
            // store Notification
            try {
                await this.notificationModuleService.createNotification({
                    title: "Friend Request",
                    body: `${user.firstName} ${user.lastName} rejected your friend request `,
                    senderId: toObjectId(userId),
                    receiverId: isFriendRequest?.senderId,
                    type: NotificationType.FRIEND_REQUEST,
                    onModel: "FriendRequest",
                    referenceId: updatedFriendRequest._id,
                });
            } catch (error) {
                console.log("Failed to create notification:", error);
            }


            // send Notification
            const receiverUserTokens = await this.redisService.getFCMs(isFriendRequest?.senderId);
            // console.log("tokens", receiverUserTokens)
            if (receiverUserTokens?.length) {
                try {
                    await this.notificationService.sendNotifications({
                        userId: isFriendRequest?.senderId,
                        tokens: receiverUserTokens,
                        title: "Friend Request",
                        body: `${user.firstName} ${user.lastName} rejected your friend request`,
                        entityId: updatedFriendRequest._id.toString(),
                        entityType: "friend_request",
                        senderId: user._id.toString(),
                        type: NotificationType.FRIEND_REQUEST,
                    });
                } catch (error) {
                    console.log("Failed to send notification:", error);
                }
            }

        }
        return updatedFriendRequest;
    }

    // ----------------------- Cancel Pending Request ✅✅ ------------------------------------

    public async cancelFriendRequest(user: HydratedDocument<IUser>, friendRequestId: string) {

        const userId = user._id.toString()

        const isFriendRequest = await this.friendRequestRepository.findOne({
            filter: {
                _id: toObjectId(friendRequestId),
                senderId: toObjectId(userId),
                status: FriendRequestStatusEnum.PENDING
            },
        })

        if (!isFriendRequest) throw new NotFoundException("Friend request not found")

        const updatedFriendRequest = await this.friendRequestRepository.findOneAndUpdate({
            filter: {
                _id: isFriendRequest._id
            },
            update: {
                status: FriendRequestStatusEnum.CANCELLED,
                deletedAt: new Date()
            }
        })
        return updatedFriendRequest;
    }

    // ------------------------------- Unfriend ✅✅----------------------------------------------

    //prevent unfriend if they are not friends (status = accepted)

    public async unfriend(user: HydratedDocument<IUser>, personId: string) {

        const userId = user._id.toString()

        const isFriendRequest = await this.friendRequestRepository.findOne({
            filter: {
                status: FriendRequestStatusEnum.ACCEPTED,
                $or: [
                    { senderId: toObjectId(userId), receiverId: toObjectId(personId) },
                    { receiverId: toObjectId(userId), senderId: toObjectId(personId) }
                ],
                deletedAt: { $exists: false }
            },
        })
        console.log(isFriendRequest)

        if (!isFriendRequest) throw new NotFoundException("You are not friends with this user")
        
        if (isFriendRequest) {

            const session = await startSession()

            let updatedFriendRequest: HydratedDocument<IFriendRequest> & { _id: Types.ObjectId } | any

            try {

                session.startTransaction()

                updatedFriendRequest = await this.friendRequestRepository.findOneAndUpdate({
                    filter: {
                        _id: isFriendRequest._id
                    },
                    update: {
                        status: FriendRequestStatusEnum.UNFRIENDED,
                        deletedAt: new Date()
                    },
                    options: {
                        new: true,
                        session
                    }
                })

                

                await this.userRepository.findOneAndUpdate({
                    filter: {
                        _id: isFriendRequest?.senderId
                    },
                    update: {
                        $inc: { friendsCount: -1 }
                    },
                    options: {
                        session
                    }
                })

                await this.userRepository.findOneAndUpdate({
                    filter: {
                        _id: isFriendRequest?.receiverId
                    },
                    update: {
                        $inc: { friendsCount: -1 }
                    },
                    options: {
                        session
                    }
                })

                await session.commitTransaction()

                return updatedFriendRequest;

            } catch (error) {
                if (session.inTransaction()) {
                    await session.abortTransaction()
                }
                throw error
            } finally {
                await session.endSession()
            }           
        }
    }

    //------------------------------- Check Status ✅✅ ------------------------------

    public async checkStatus(user: HydratedDocument<IUser>, friendId: string): Promise<string> {
        const userId = user._id.toString()

        const isFriendRequest = await this.friendRequestRepository.findOne({
            filter: {
                $or: [
                    { senderId: toObjectId(userId), receiverId: toObjectId(friendId) },
                    { senderId: toObjectId(friendId), receiverId: toObjectId(userId) }
                ]
            },
        })

        // if (!isFriendRequest) throw new NotFoundException("Friend request not found")
        
        if(isFriendRequest?.deletedAt){
            return "Send Friend Request" 
        }

        if (isFriendRequest?.status === FriendRequestStatusEnum.PENDING) {
            if (isFriendRequest?.senderId.toString() === userId) {
                return "Requested"
            }
            return "Accept Request"
        }

        if(isFriendRequest?.status === FriendRequestStatusEnum.ACCEPTED){
            return "Friends"
        }

        return "Send Friend Request"
    }

    // ---------------------------- Get Friend Requests I Sent ✅✅ -----------------------------
    
    public async GetPendingFriendRequestsSent(user: HydratedDocument<IUser>, {page, size}: {page?: number, size?: number}){
        const userId = user._id.toString()
        // console.log(page, size)
        const pendingRequests = await this.friendRequestRepository.paginate({
            filter: {
                senderId: toObjectId(userId),
                status: FriendRequestStatusEnum.PENDING
            },
            page,
            size,
            options: {
                populate: [
                    {
                        path: "receiverId",
                        select: "firstName lastName profilePicture email"
                    }
                ],
            }
        })
        // console.log(pendingRequests)
        return pendingRequests
    }

    // ---------------------------- Get Friend Requests I Received ✅✅-----------------------------

    public async GetPendingFriendRequestsReceived(user: HydratedDocument<IUser>, { page, size }: { page?: number, size?: number }) {
        const userId = user._id.toString()
        const pendingRequests = await this.friendRequestRepository.paginate({
            filter: {
                receiverId: toObjectId(userId),
                status: FriendRequestStatusEnum.PENDING
            },
            page,
            size,
            options: {
                populate: [
                    {
                        path: "senderId",
                        select: "firstName lastName profilePicture email"
                    }
                ],
            }
        })
        return pendingRequests
    }

    // =======================================================================

    private buildAcceptedFriendsFilter(userId: string) {
        return {
            status: FriendRequestStatusEnum.ACCEPTED,
            deletedAt: { $exists: false },
            $or: [
                { senderId: toObjectId(userId) },
                { receiverId: toObjectId(userId) }
            ]
        };
    }

    // -------------------------------- Get Friends Paginated ✅✅ -------------------------------

    public async getMyFriends(user: HydratedDocument<IUser>, { page, size }: { page?: number, size?: number }) {
        const userId = user._id.toString()

        const friends = await this.friendRequestRepository.paginate({
            filter: this.buildAcceptedFriendsFilter(userId),
            page,
            size,
            options: {
                populate: [
                    {
                        path: "senderId",
                        select: "firstName lastName profilePicture email"
                    },
                    {
                        path: "receiverId",
                        select: "firstName lastName profilePicture email"
                    }
                ],
            }
        })
        return friends
    }

    // ------------------------ Get Friends Ids for Availability ✅✅ -------------------------------

    public async getAcceptedFriendIds(userId: Types.ObjectId | string): Promise<Types.ObjectId[]> {
        const friendships = await this.friendRequestRepository.findAll({
            filter: this.buildAcceptedFriendsFilter(userId.toString()),
            projection: { senderId: 1, receiverId: 1 },
        });
        return (friendships || []).map((f) =>
            f.senderId.toString() === userId.toString() ? f.receiverId : f.senderId
        );
    }

    // Why this projection?
    // We only need the IDs to build an array.
    // If the query retrieves all fields (especially if there are heavy fields like long texts or arrays),
    // it will be extra data transferred from the database to the server without any use
    // ---unnecessary consumption of network and memory---
    // Since this method will be called frequently (every time someone retrieves a list of posts),
    // this difference becomes more important than it seems.

}

export const friendRequestService = new FriendRequestService()