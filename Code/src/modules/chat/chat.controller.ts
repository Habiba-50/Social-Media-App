import { Router } from "express";
import type { NextFunction, Request, Response } from "express";
import { authentication } from "../../middleware";
import { successResponse } from "../../common/response";
import { chatService } from "./chat.service";
import { cloudFileUpload, fileFieldValidation } from "../../common/utils/multer";
import { Types } from "mongoose";
import { toObjectId } from "../../common/utils/objectId";


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

// ------------------------------ Update Group Chat -----------------------------------

router.patch(
    "/group/:groupId/update",
    authentication(),
    async (req: Request, res: Response, next: NextFunction) => {
        const data = await chatService.editGroupChat(
            req.user._id as Types.ObjectId,
            toObjectId(req.params?.groupId as string) as Types.ObjectId,
            req.body
        );
        return successResponse({ res, statusCode: 200, data });
    }
)

// ------------------------------ Add Member to Group Chat -----------------------------------

router.patch(
    "/group/:groupId/add-member",
    authentication(),
    async (req: Request, res: Response, next: NextFunction) => {
        const data = await chatService.addMembersToGroupChat(
            req.user._id as Types.ObjectId,
            toObjectId(req.params?.groupId as string) as Types.ObjectId,
            req.body.members as string[]
        );
        return successResponse({ res, statusCode: 200, data });
    }
)

// ------------------------------ Remove Member from Group Chat -----------------------------------

router.patch(
    "/group/:groupId/remove-member/:memberId",
    authentication(),
    async (req: Request, res: Response, next: NextFunction) => {
        const data = await chatService.removeMemberFromGroupChat(
            req.user._id as Types.ObjectId,
            toObjectId(req.params?.groupId as string) as Types.ObjectId,
            toObjectId(req.params?.memberId as string) as Types.ObjectId
        );
        return successResponse({ res, statusCode: 200, data });
    }
)


// ------------------------------ Leave Group Chat -----------------------------------

router.patch(
    "/group/:groupId/leave",
    authentication(),
    async (req: Request, res: Response, next: NextFunction) => {
        const data = await chatService.leaveGroupChat(
            req.user._id as Types.ObjectId,
            toObjectId(req.params?.groupId as string) as Types.ObjectId
        );
        return successResponse({ res, statusCode: 200, data });
    }
)

// ------------------------------ Delete Group Chat -----------------------------------

router.patch(
    "/group/:groupId/delete",
    authentication(),
    async (req: Request, res: Response, next: NextFunction) => {
        const data = await chatService.deleteGroupChat(
            req.user._id as Types.ObjectId,
            toObjectId(req.params?.groupId as string) as Types.ObjectId
        );
        return successResponse({ res, statusCode: 200, data });
    }
)

export default router;