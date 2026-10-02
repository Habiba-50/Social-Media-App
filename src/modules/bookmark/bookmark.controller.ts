import { Router } from "express";
import { authentication, validation } from "../../middleware";
import { bookmarkService } from "./bookmark.service";
import * as validators from "./bookmark.validation"
import { HydratedDocument } from "mongoose";
import { IUser } from "../../common/interfaces";


const router = Router();

// save post
router.post("/:postId", authentication(), validation(validators.savePostValidation),async (req, res, next) => {
    const result = await bookmarkService.savePost(req.user, req.params.postId as string);
    res.status(200).json({
        success: true,
        message: "Post saved successfully",
        data: result
    })
})


// unsave post
router.patch("/:postId", authentication(), validation(validators.savePostValidation),async (req, res, next) => {
    const result = await bookmarkService.unsavePost(req.user, req.params.postId as string);
    res.status(200).json({
        success: true,
        message: "Post unsaved successfully",
        data: result
    })
})


// Get my saved posts (paginated)
router.get("/", authentication(), validation(validators.mySavedPostsValidation),async (req, res, next) => {
    const result = await bookmarkService.mySavedPosts(
        req.user as HydratedDocument<IUser>,
        {
            page: Number(req.query?.page),
            size: Number(req.query?.limit),
        }
    );
    res.status(200).json({
        success: true,
        message: "My saved posts",
        data: result
    })
})


// Check if a specific post is saved
router.get("/:postId", authentication(), validation(validators.savePostValidation),async (req, res, next) => {
    const result = await bookmarkService.isSavedPost(req.user, req.params.postId as string);
    res.status(200).json({
        success: true,
        message: "Post status",
        data: result
    })
})


export default router;