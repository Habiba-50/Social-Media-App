import { Router } from "express";
import type { NextFunction, Request, Response } from "express";
import {
  authentication,
  validation,
} from "../../middleware";

import { successResponse } from "../../common/response";
import {
  cloudFileUpload,
  fileFieldValidation,
} from "../../common/utils/multer";
import * as validators from "./comment.validation";

import { commentService } from "./comment.service";
import { CreateCommentParamsDto, DeleteCommentParamsDto, ReactCommentParamsDto, ReactCommentQueryDto, ReactReplyParamsDto, ReactReplyQueryDto, ReplyOnCommentParamsDto, UpdateCommentBodyDto, UpdateCommentParamsDto } from "./comment.dto";

const router = Router({ mergeParams: true });

// Create Comment
router.post(
  "/",
  authentication(),
  cloudFileUpload({
    validation: fileFieldValidation.image,
  }).array("attachments", 2),

  validation(validators.createComment),

  async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<Response> => {
    const data = await commentService.createComment(
      req.params as unknown as CreateCommentParamsDto,
      {
        ...req.body,
        files: req.files as Express.Multer.File[],
      },
      req.user,
    );

    return successResponse({
      res,
      statusCode: 201,
      message: "Comment created successfully",
      data,
    });
  },
);

// Reply on Comment
router.post(
  "/:commentId/reply",
  authentication(),
  cloudFileUpload({
    validation: fileFieldValidation.image,
  }).array("attachments", 2),

  validation(validators.replyOnComment),

  async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<Response> => {
    const data = await commentService.replyOnComment(
      req.params as ReplyOnCommentParamsDto,
      {
        ...req.body,
        files: req.files as Express.Multer.File[],
      },
      req.user,
    );

    return successResponse({
      res,
      statusCode: 201,
      message: "Reply on comment created successfully",
      data,
    });
  },
);

// ----------------------------------------------------------------

// Update Comment
router.patch(
  "/:commentId",
  authentication(),

  cloudFileUpload({
    validation: fileFieldValidation.image,
  }).array("attachments", 2),
  validation(validators.replyOnComment),

  async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<Response> => {
    const data = await commentService.updateComment(
      req.params as UpdateCommentParamsDto,
      {
        ...(req.body as UpdateCommentBodyDto),
        files: req.files as Express.Multer.File[],
      },
      req.user,
    );

    return successResponse({
      res,
      statusCode: 200,
      message: "Comment updated successfully",
      data,
    });
  },
);

// -----------------------------------------------------------------

// Delete Comment
router.delete(
  "/:commentId",
  authentication(),
  validation(validators.deleteComment),
  async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<Response> => {
    const data = await commentService.deleteComment(
      req.params as DeleteCommentParamsDto,
      req.user,
    );
    return successResponse({ res, statusCode: 200, data });
  },
);

//-----------------------------------------------------------------

// Restore Comment
router.patch(
  "/:commentId/restore",
  authentication(),
  validation(validators.deleteComment),
  async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<Response> => {
    const data = await commentService.restoreComment(
      req.params as DeleteCommentParamsDto,
      req.user,
    );
    return successResponse({ res, statusCode: 200, data });
  },
);

//-----------------------------------------------------------------

// React Comment
router.patch(
    '/:commentId/react',
    authentication(),
    validation(validators.reactComment),
  async (req: Request, res: Response, next: NextFunction): Promise<Response> => {
      console.log(req.query.react);
      
        const data = await commentService.reactComment(
            req.params as unknown as ReactCommentParamsDto,
            req.query as unknown as ReactCommentQueryDto,
            req.user
        );       
         return successResponse({ res, statusCode: 200, data });
    }
)

// ----------------------------------------------------------------

// React Reply
router.patch(
  '/:commentId/reply/:replyId/react',
  authentication(),
  validation(validators.reactReply),
  async (req: Request, res: Response, next: NextFunction): Promise<Response> => {
    const data = await commentService.reactReply(
      req.params as unknown as ReactReplyParamsDto,
      req.query as unknown as ReactReplyQueryDto,
      req.user
    );
    return successResponse({ res, statusCode: 200, data });
  }
)

//-----------------------------------------------------------------

// Destroy Comment
router.delete(
    '/:commentId/destroy',
    authentication(),
    validation(validators.deleteComment),
    async (
        req: Request,
        res: Response,
        next: NextFunction,
    ): Promise<Response> => {
        const data = await commentService.destroyComment(
            req.params as DeleteCommentParamsDto,
            req.user,
        );
        return successResponse({ res, statusCode: 200, data });
    },
)

//------------------------------------------------------------------

// Get Comment
router.get(
  "/:commentId",
  authentication(),
  validation(validators.getComment),
  async (req: Request, res: Response, next: NextFunction) => {
    const data = await commentService.getComments(req.params as { commentId: string });
    return successResponse({ res, statusCode: 200, data });
  },
);



export default router;
