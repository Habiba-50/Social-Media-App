import { Router } from "express";
import { friendRequestService } from "./friendRequest.service";
import { authentication, validation } from "../../middleware";
import type { Request, Response, NextFunction } from "express";
import * as validators from "./friendRequest.validation";


const router = Router()

//Send Request

router.post("/:receiverId", authentication(), validation(validators.sendRequest), async (req: Request, res: Response, next: NextFunction) => {
    console.log("Hello")
    const sendRequest = await friendRequestService.sendFriendRequest(
        req.user,
        req.params?.receiverId as string
    )
    return res.status(200).json({
        success: true,
        message: "Request sent successfully",
        data: sendRequest
    })
})



// ----------------------------------------------------------------------------

//Accept Request

router.patch("/:requestId/accept", authentication(), validation(validators.acceptRequest), async (req: Request, res: Response, next: NextFunction) => {
    const sendRequest = await friendRequestService.acceptFriendRequest(
        req.user,
        req.params?.requestId as string
    )
    return res.status(200).json({
        success: true,
        message: "Request accepted successfully",
        data: sendRequest
    })
})

// -----------------------------------------------------------------------------

//Reject Request

router.patch("/:requestId/reject", authentication(), validation(validators.rejectRequest), async (req: Request, res: Response, next: NextFunction) => {
    const rejectRequest = await friendRequestService.rejectFriendRequest(
        req.user,
        req.params?.requestId as string
    )
    return res.status(200).json({
        success: true,
        message: "Request rejected successfully",
        data: rejectRequest
    })
})

// -----------------------------------------------------------------------------

//Cancel Pending Request

router.patch("/:requestId/cancel", authentication(), validation(validators.cancelRequest), async (req: Request, res: Response, next: NextFunction) => {
    const cancelRequest = await friendRequestService.cancelFriendRequest(
        req.user,
        req.params?.requestId as string
    )
    return res.status(200).json({
        success: true,
        message: "Request cancelled successfully",
        data: cancelRequest
    })
})

// -----------------------------------------------------------------------------

//Unfriend

//prevent unfriend if they are not friends (status = accepted)
router.patch("/:personId/unfriend", authentication(), validation(validators.unfriend), async (req: Request, res: Response, next: NextFunction) => {
    const unfriend = await friendRequestService.unfriend(
        req.user,
        req.params?.personId as string
    )
    return res.status(200).json({
        success: true,
        message: "Unfriended successfully",
        data: unfriend
    })
})

// -----------------------------------------------------------------------------

// Check the  status between two users

router.get("/:friendId/status", authentication(), validation(validators.checkStatus), async (req: Request, res: Response, next: NextFunction) => {
    const status = await friendRequestService.checkStatus(
        req.user,
        req.params?.friendId as string
    )
    return res.status(200).json({
        success: true,
        message: "Status checked",
        data: status
    })
})


// -----------------------------------------------------------------------------

//Get Friend Requests
//sent
router.get("/requests-sent", authentication(), validation(validators.getPendingFriendRequestsSent), async (req: Request, res: Response, next: NextFunction) => {
    const friendRequests = await friendRequestService.GetPendingFriendRequestsSent(
        req.user,
        {
            page: Number(req.query?.page) || 1,
            size: Number(req.query?.size) || 10
        }
    )
    return res.status(200).json({
        success: true,
        message: "Requests sent successfully",
        data: friendRequests
    })
})

// -----------------------------------------------------------------------------

//Get Incoming Friend Requests

router.get("/requests-received", authentication(), validation(validators.getPendingFriendRequestsReceived), async (req: Request, res: Response, next: NextFunction) => {
    const friendRequests = await friendRequestService.GetPendingFriendRequestsReceived(
        req.user,
        {
            page: Number(req.query?.page) || 1,
            size: Number(req.query?.size) || 10
        }
    )
    return res.status(200).json({
        success: true,
        message: "Requests received successfully",
        data: friendRequests
    })
})

// -----------------------------------------------------------------------------

//Get Friends

router.get("/my-friends", authentication(), validation(validators.getMyFriends), async (req: Request, res: Response, next: NextFunction) => {
    const friends = await friendRequestService.getMyFriends(
        req.user,
        {
            page: Number(req.query?.page) || 1,
            size: Number(req.query?.size) || 10
        }
    )
    return res.status(200).json({
        success: true,
        message: "Friends successfully",
        data: friends
    })
})


export default router
