import { HydratedDocument } from "mongoose";
import { IUser } from "../interfaces";
import { AvailabilityEnum } from "../enums";
import { friendRequestService } from "../../modules/friendRequest";
import { BlockRepository } from "../../DB/repository";
import { BadRequestException } from "../exceptions";

export const getAvailability = async (
    user: HydratedDocument<IUser>
) => {
    // Not available for blocked users
    const blockRepository = new BlockRepository()
    const isBlocked = await blockRepository.findOne({
        filter: {
            $or: [
                { blockerId: user._id },
                { blockedId: user._id }
            ],
            deletedAt: { $exists: false },
        }
    })
    if (isBlocked) {
        throw new BadRequestException("This post is not available")
    }


    // Available for friends
    // Available for only me
    // Available for tags
    // Available for public

    const friendIds = await friendRequestService.getAcceptedFriendIds(user._id);

    return [
        { availability: AvailabilityEnum.PUBLIC },

        {
            availability: AvailabilityEnum.FRIENDS,
            $or: [
                { createdBy: user._id },
                { createdBy: { $in: friendIds } }
            ]
        },

        {
            availability: AvailabilityEnum.ONLY_ME,
            createdBy: user._id
        },

        {
            tags: { $in: [user._id] }
        }
    ];
};