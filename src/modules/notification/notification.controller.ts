import { Router, type NextFunction, type Request, type Response } from "express";
import { successResponse } from "../../common/response";
import { authentication } from "../../middleware";
import { notificationModuleService } from "./notification.service";
import { IUser } from "../../common/interfaces";
import { Types } from "mongoose";


const router = Router();

// Get All Notifications with pagination and optional search
router.get("/", authentication(), async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    const data = await notificationModuleService.getNotificationList(
        {
            page: req.query.page as string,
            size: req.query.limit as string,
            search: req.query.search as string || undefined,
        },
        req.user as IUser & { _id: Types.ObjectId }
    );
    return successResponse({ res, statusCode: 200, data });
})

// Get Unread Notifications paginated
router.get("/unread", authentication(), async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    const data = await notificationModuleService.getUnreadNotifications(
        req.user as IUser & { _id: Types.ObjectId },
        {
            page: req.query.page as string,
            size: req.query.limit as string,
        }
    );
    return successResponse({ res, statusCode: 200, data });
})

// Get Unread Notifications Count
router.get("/unread/count", authentication(), async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    const data = await notificationModuleService.getUnreadCount(
        req.user as IUser & { _id: Types.ObjectId }
    );
    return successResponse({ res, statusCode: 200, data });
})

// Mark All Notifications as Read
router.patch("/mark-all-as-read", authentication(), async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    const data = await notificationModuleService.markAllAsRead(
        req.user as IUser & { _id: Types.ObjectId }
    );
    return successResponse({ res, statusCode: 200, data });
})

// Get a specific notification (must be placed AFTER static /unread routes)
router.get("/:notificationId", authentication(), async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    const data = await notificationModuleService.getNotificationById(
        req.params.notificationId as string,
        req.user as IUser & { _id: Types.ObjectId }
    );
    return successResponse({ res, statusCode: 200, data });
})

// Delete a specific notification
router.delete("/:notificationId", authentication(), async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    const data = await notificationModuleService.deleteNotification(
        req.params.notificationId as string,
        req.user as IUser & { _id: Types.ObjectId }
    );
    return successResponse({ res, statusCode: 200, data });
})

// Delete All Notifications
router.delete("/", authentication(), async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    const data = await notificationModuleService.deleteAllNotifications(
        req.user as IUser & { _id: Types.ObjectId }
    );
    return successResponse({ res, statusCode: 200, data });
})

// Restore a specific notification
router.patch("/restore/:notificationId", authentication(), async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    const data = await notificationModuleService.restoreNotification(
        req.params.notificationId as string,
        req.user as IUser & { _id: Types.ObjectId }
    );
    return successResponse({ res, statusCode: 200, data });
})

// Restore All Notifications
router.patch("/restore-all", authentication(), async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    const data = await notificationModuleService.restoreAllNotifications(
        req.user as IUser & { _id: Types.ObjectId }
    );
    return successResponse({ res, statusCode: 200, data });
})


export default router;