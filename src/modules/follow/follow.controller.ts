import type { Request, Response, NextFunction } from "express";
import { Router } from "express"
import { authentication, validation } from "../../middleware";
import followService from "./follow.service";
import * as validators from './follow.validation'


const router = Router()

// Follow
router.post("/:followingId",authentication(), validation(validators.follow) ,async (req :Request, res:Response, next:NextFunction): Promise<any> => {
    try {
        const result = await followService.follow(
            req.user, 
            req.params?.followingId?.toString() as string
        )

        return res.status(201).json({
            success:true,
            message:"Followed successfully",
            data:result
        })
    } catch (error) {
        next(error)
    }
})



// Unfollow
router.delete("/:followingId", authentication(), validation(validators.unfollow), async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    try {
        const result = await followService.unFollow(
            req.user?._id.toString() as string,
            req.params?.followingId?.toString() as string
        )

        return res.status(201).json({
            success: true,
            message: "UnFollowed successfully",
            data: result
        })
    } catch (error) {
        next(error)
    }
})


// Get following users
router.get("/following", authentication(), validation(validators.getFollowingUsers) , async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    try {
        const result = await followService.getFollowingUsers(
            req.user?._id.toString() as string,
            {
                page: req.query?.page as string,
                size: req.query?.size as string,
            }
        )

        return res.status(200).json({
            success: true,
            message: "Following users fetched successfully",
            data: result
        })
    } catch (error) {
        next(error)
    }
})

// Get followers users
router.get("/followers", authentication(), validation(validators.getFollowersUsers), async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    try {
        const result = await followService.getFollowersUsers(
            req.user?._id.toString() as string,
            {
                page: req.query?.page as string,
                size: req.query?.size as string,
            }
        )

        return res.status(200).json({
            success: true,
            message: "Followers users fetched successfully",
            data: result
        })
    } catch (error) {
        next(error)
    }
})


// Check Status
router.get("/status/:followingId", authentication(), validation(validators.follow), async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    try {
        const result = await followService.checkStatus(
            req.user?._id.toString() as string,
            req.params?.followingId?.toString() as string
        )

        return res.status(200).json({
            success: true,
            message: "Status fetched successfully",
            data: result
        })
    } catch (error) {
        next(error)
    }
})


export default router;
