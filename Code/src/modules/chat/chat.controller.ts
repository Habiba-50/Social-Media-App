import { Router } from "express";
import type { NextFunction, Request, Response } from "express";
import { authentication } from "../../middleware";
import { successResponse } from "../../common/response";
import { chatService } from "./chat.service";
import { cloudFileUpload, fileFieldValidation } from "../../common/utils/multer";


const router = Router({ mergeParams: true });

// -------------------------------- Get User Chat----------------------------------------------
router.get(
    "/",
    authentication(),
    async (req: Request, res: Response, next: NextFunction) => {
        const data = await chatService.getChat(
            req.params.userId as string,
            req.query as unknown as { page?: string; size?: string },
            req.user
        );
        return successResponse({ res, statusCode: 200, data });
    }
)

// -------------------------------- Get Group Chat----------------------------------------------
router.get(
    "/group/:groupId",
    authentication(),
    async (req: Request, res: Response, next: NextFunction) => {
        const data = await chatService.getGroupChat(
            req.params.groupId as string,
            req.query as unknown as { page?: string; size?: string },
            req.user
        );
        return successResponse({ res, statusCode: 200, data });
    }
)

// -------------------------------- Creat Chating Group----------------------------------------------
router.post(
    "/group",
    authentication(),
    cloudFileUpload({validation : fileFieldValidation.image}).single("attachment"),
    async (req: Request, res: Response, next: NextFunction) => {
        const data = await chatService.createGroupChat(
            req.body,
            req.user,
            req.file as Express.Multer.File
        );
        return successResponse({ res, statusCode: 200, data });
    }
)

// -------------------------------- Get My Chats----------------------------------------------
router.get(
    "/my-chats",
    authentication(),
    async (req: Request, res: Response, next: NextFunction) => {
        const data = await chatService.getMyChats(
            req.user,
            { page : Number(req.query.page),
            size : Number(req.query.size)}
        );
        return successResponse({ res, statusCode: 200, data });
    }
)


export default router;