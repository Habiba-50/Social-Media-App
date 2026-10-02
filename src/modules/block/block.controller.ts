import { Router } from "express";
import { authentication, validation } from "../../middleware";
import { blockService } from "./block.service";
import * as validators from "./block.validation"


export const router = Router()

// Block user

router.post("/:blockedId", authentication(), validation(validators.blockValidation), async (req, res, next): Promise<any> => {
    try {

        const result = await blockService.block(
            req.user?._id.toString() as string,
            req.params?.blockedId?.toString() as string
        )

        return res.status(201).json({
            success: true,
            message: "User blocked successfully",
            data: result
        })
    } catch (error) {
        next(error)
    }
})



// -------------------------------------------------------------

// Unblock user

router.patch("/:blockedId", authentication(), validation(validators.unblockValidation), async (req, res, next): Promise<any> => {
    try {

        const result = await blockService.unblock(
            req.user?._id.toString() as string,
            req.params?.blockedId?.toString() as string
        )

        return res.status(201).json({
            success: true,
            message: "User unblocked successfully",
            data: result
        })
    } catch (error) {
        next(error)
    }
})

// -------------------------------------------------------------

// Get my blocked users(paginated)

router.get("/", authentication(), validation(validators.myBlockedUsersValidation), async (req, res, next): Promise<any> => {
    try {

        const result = await blockService.myBlockedUsers(
            req.user?._id.toString() as string,
            {
                page: req.query.page as unknown as number,
                size: req.query.size as unknown as number,
                search: req.query.search as unknown as string
            }
        )

        return res.status(200).json({
            success: true,
            message: "My blocked users fetched successfully",
            data: result
        })
    } catch (error) {
        next(error)
    }
})




// -------------------------------------------------------------

// Check Blocked OR Not
// => Check if a specific user is blocked

router.get("/:blockedId", authentication(), validation(validators.isBlockedValidation), async (req, res, next): Promise<any> => {
    try {

        const result = await blockService.isBlocked(
            req.user?._id.toString() as string,
            req.params?.blockedId?.toString() as string
        )

        return res.status(200).json({
            success: true,
            message: "User blocked status fetched successfully",
            data: result
        })
    } catch (error) {
        next(error)
    }
})


