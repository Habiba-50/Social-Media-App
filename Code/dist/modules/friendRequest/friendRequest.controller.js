"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const friendRequest_service_1 = require("./friendRequest.service");
const middleware_1 = require("../../middleware");
const validators = __importStar(require("./friendRequest.validation"));
const router = (0, express_1.Router)();
router.post("/:receiverId", (0, middleware_1.authentication)(), (0, middleware_1.validation)(validators.sendRequest), async (req, res, next) => {
    console.log("Hello");
    const sendRequest = await friendRequest_service_1.friendRequestService.sendFriendRequest(req.user, req.params?.receiverId);
    return res.status(200).json({
        success: true,
        message: "Request sent successfully",
        data: sendRequest
    });
});
router.patch("/:requestId/accept", (0, middleware_1.authentication)(), (0, middleware_1.validation)(validators.acceptRequest), async (req, res, next) => {
    const sendRequest = await friendRequest_service_1.friendRequestService.acceptFriendRequest(req.user, req.params?.requestId);
    return res.status(200).json({
        success: true,
        message: "Request accepted successfully",
        data: sendRequest
    });
});
router.patch("/:requestId/reject", (0, middleware_1.authentication)(), (0, middleware_1.validation)(validators.rejectRequest), async (req, res, next) => {
    const rejectRequest = await friendRequest_service_1.friendRequestService.rejectFriendRequest(req.user, req.params?.requestId);
    return res.status(200).json({
        success: true,
        message: "Request rejected successfully",
        data: rejectRequest
    });
});
router.patch("/:requestId/cancel", (0, middleware_1.authentication)(), (0, middleware_1.validation)(validators.cancelRequest), async (req, res, next) => {
    const cancelRequest = await friendRequest_service_1.friendRequestService.cancelFriendRequest(req.user, req.params?.requestId);
    return res.status(200).json({
        success: true,
        message: "Request cancelled successfully",
        data: cancelRequest
    });
});
router.patch("/:personId/unfriend", (0, middleware_1.authentication)(), (0, middleware_1.validation)(validators.unfriend), async (req, res, next) => {
    const unfriend = await friendRequest_service_1.friendRequestService.unfriend(req.user, req.params?.personId);
    return res.status(200).json({
        success: true,
        message: "Unfriended successfully",
        data: unfriend
    });
});
router.get("/:friendId/status", (0, middleware_1.authentication)(), (0, middleware_1.validation)(validators.checkStatus), async (req, res, next) => {
    const status = await friendRequest_service_1.friendRequestService.checkStatus(req.user, req.params?.friendId);
    return res.status(200).json({
        success: true,
        message: "Status checked",
        data: status
    });
});
router.get("/requests-sent", (0, middleware_1.authentication)(), (0, middleware_1.validation)(validators.getPendingFriendRequestsSent), async (req, res, next) => {
    const friendRequests = await friendRequest_service_1.friendRequestService.GetPendingFriendRequestsSent(req.user, {
        page: Number(req.query?.page) || 1,
        size: Number(req.query?.size) || 10
    });
    return res.status(200).json({
        success: true,
        message: "Requests sent successfully",
        data: friendRequests
    });
});
router.get("/requests-received", (0, middleware_1.authentication)(), (0, middleware_1.validation)(validators.getPendingFriendRequestsReceived), async (req, res, next) => {
    const friendRequests = await friendRequest_service_1.friendRequestService.GetPendingFriendRequestsReceived(req.user, {
        page: Number(req.query?.page) || 1,
        size: Number(req.query?.size) || 10
    });
    return res.status(200).json({
        success: true,
        message: "Requests received successfully",
        data: friendRequests
    });
});
router.get("/my-friends", (0, middleware_1.authentication)(), (0, middleware_1.validation)(validators.getMyFriends), async (req, res, next) => {
    const friends = await friendRequest_service_1.friendRequestService.getMyFriends(req.user, {
        page: Number(req.query?.page) || 1,
        size: Number(req.query?.size) || 10
    });
    return res.status(200).json({
        success: true,
        message: "Friends successfully",
        data: friends
    });
});
exports.default = router;
