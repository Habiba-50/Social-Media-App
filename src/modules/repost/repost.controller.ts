import { Router } from "express";
import { authentication, validation } from "../../middleware";
import * as validators from "./repost.validation"
import { repostService } from "./repost.service";


export const router = Router();

// Create repost (content optional in body)
router.post("/:postId", authentication(), validation(validators.repostValidation) ,async (req, res, next): Promise<any> => {
    try {
    const result = await repostService.createRepost(req.params.postId as string, req.body, req.user)
    
        return res.status(201).json({
            success: true,
            message: "Repost created successfully",
            data: result
        })   

    } catch (error) {
        next(error)
    }
})

// ---------------------------------------------------------
// Undo / delete repost(soft - delete)

router.delete("/:repostId", authentication(), validation(validators.undoRepostValidation) ,async (req, res, next): Promise<any> => {
    try {
        const result = await repostService.deleteRepost(req.params.repostId as string, req.user)
        return res.status(200).json({
            success: true,
            message: "Repost deleted successfully",
            data: result
        })
    } catch (error) {
        next(error)
    }
})


// --------------------------------------------------------
// Get a user's reposts (for their profile)
router.get("/my-reposts", authentication(), validation(validators.paginationValidation) , async (req, res, next): Promise<any> => {
    try {
        const result = await repostService.getUserReposts(req.user, {
            page: Number(req.query?.page),
            size: Number(req.query?.size)
        })
        return res.status(200).json({
            success: true,
            message: "Reposts of post fetched successfully",
            data: result
        })
    } catch (error) {
        next(error)
    }
})


// --------------------------------------------------------
// Get reposts of a specific post(who reposted it)

router.get("/:postId", authentication(), validation(validators.getRepostsOfPostValidation) ,async (req, res, next): Promise<any> => {
    try {
        const result = await repostService.getRepostsOfPost(req.params.postId as string, {
            page: Number(req.query?.page),
            size: Number(req.query?.size)
        })
        return res.status(200).json({
            success: true,
            message: "Reposts of post fetched successfully",
            data: result
        })
    } catch (error) {
        next(error)
    }
})





export default router;