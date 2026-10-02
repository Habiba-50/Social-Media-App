import { Router } from "express";
import type { NextFunction, Request, Response } from "express";
import { authentication , normalizePostUpdate, validation } from "../../middleware";
import postService from "./post.service";
import { successResponse } from "../../common/response";
import { cloudFileUpload, fileFieldValidation } from "../../common/utils/multer";
import * as validators from "./post.validation";
import {paginationValidationSchema } from "../../common/validation";
import { ReactPostQueryDto, UpdatePostBodyDto, UpdatePostParamsDto } from "./post.dto";
import { commentRouter } from "../comment";



const router = Router();
router.use("/:postId/comment",commentRouter);


// Create Post
router.post(
    "/",
    authentication(),
    cloudFileUpload({
        validation: fileFieldValidation.image
    }).array("attachments", 2),

    validation(validators.createPost),

    async (
        req: Request,
        res: Response,
        next: NextFunction
    ): Promise<Response> => {

        const data = await postService.createPost(
            {
                ...req.body,
                files: req.files as Express.Multer.File[]
            },
            req.user
        );

        return successResponse({
            res,
            statusCode: 201,
            message: "Post created successfully",
            data
        });
    }
);

// Update Post
router.patch(
    "/:postId",
    authentication(),

    cloudFileUpload({
        validation: fileFieldValidation.image
    }).array("attachments", 2),
    normalizePostUpdate,
    validation(validators.updatePost),

    async (
        req: Request,
        res: Response,
        next: NextFunction
    ): Promise<Response> => {

        const data = await postService.updatePost(
            req.params as UpdatePostParamsDto,
            {
                ...req.body as UpdatePostBodyDto,
                files: req.files as Express.Multer.File[]
            },
            req.user
        );

        return successResponse({
            res,
            statusCode: 200,
            message: "Post updated successfully",
            data
        });
    }
);


// React Post
router.patch(
    '/:postId/react',
    authentication(),
    validation(validators.reactPost),
    async (req: Request, res: Response, next: NextFunction): Promise<Response> => {
        const data = await postService.reactPost(
            { postId: req.params.postId as string },
            req.query as unknown as ReactPostQueryDto,
            req.user
        );        return successResponse({ res, statusCode: 200, data });
    }
)


// Get Post List
router.get('/',
    authentication(),
    validation(paginationValidationSchema),
    async (req: Request, res: Response, next: NextFunction) => {
        const data = await postService.getPostList(req.query as any,req.user);
        return successResponse({ res, statusCode: 200, data });
    }
)

// Get Feed
router.get('/feed',
    authentication(),
    validation(paginationValidationSchema),
    async (req: Request, res: Response, next: NextFunction) => {
        const data = await postService.getFeed(req.user,req.query as any);
        return successResponse({ res, statusCode: 200, data });
    }
)


// Get Post
router.get('/:id',
    authentication(),
    validation(validators.deletePost),
    async (req: Request, res: Response, next: NextFunction) => {
        const data = await postService.getPost(req.params.id as string, req.user as any);
        return successResponse({ res, statusCode: 200, data });
    }
)


// Delete Post
router.delete('/:id',
    authentication(),
    validation(validators.deletePost),
    async (req: Request, res: Response, next: NextFunction) => {
        const data = await postService.deletePost(req.params.id as string,req.user);
        return successResponse({ res, statusCode: 200, data });
    }
)

// Restore Post
router.patch('/restore/:id',
    authentication(),
    validation(validators.deletePost),
    async (req: Request, res: Response, next: NextFunction) => {
        const data = await postService.restorePost(req.params.id as string,req.user);
        return successResponse({ res, statusCode: 200, data });
    }
)

// Destroy Post
router.delete('/destroy/:id',
    authentication(),
    validation(validators.deletePost),
    async (req: Request, res: Response, next: NextFunction): Promise<Response> => {
        const data = await postService.destroyPost(req.params.id as string,req.user);
        return successResponse({ res, statusCode: 200, data });
    }
)



export default router;