"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const middleware_1 = require("../../middleware");
const response_1 = require("../../common/response");
const chat_service_1 = require("./chat.service");
const multer_1 = require("../../common/utils/multer");
const objectId_1 = require("../../common/utils/objectId");
const router = (0, express_1.Router)({ mergeParams: true });
router.get("/", (0, middleware_1.authentication)(), async (req, res, next) => {
    const data = await chat_service_1.chatService.getChat(req.params.userId, req.query, req.user);
    return (0, response_1.successResponse)({ res, statusCode: 200, data });
});
router.get("/group/:groupId", (0, middleware_1.authentication)(), async (req, res, next) => {
    const data = await chat_service_1.chatService.getGroupChat(req.params.groupId, req.query, req.user);
    return (0, response_1.successResponse)({ res, statusCode: 200, data });
});
router.post("/group", (0, middleware_1.authentication)(), (0, multer_1.cloudFileUpload)({ validation: multer_1.fileFieldValidation.image }).single("attachment"), async (req, res, next) => {
    const data = await chat_service_1.chatService.createGroupChat(req.body, req.user, req.file);
    return (0, response_1.successResponse)({ res, statusCode: 200, data });
});
router.get("/my-chats", (0, middleware_1.authentication)(), async (req, res, next) => {
    const data = await chat_service_1.chatService.getMyChats(req.user, { page: Number(req.query.page),
        size: Number(req.query.size) });
    return (0, response_1.successResponse)({ res, statusCode: 200, data });
});
router.patch("/group/:groupId/update", (0, middleware_1.authentication)(), async (req, res, next) => {
    const data = await chat_service_1.chatService.editGroupChat(req.user._id, (0, objectId_1.toObjectId)(req.params?.groupId), req.body);
    return (0, response_1.successResponse)({ res, statusCode: 200, data });
});
router.patch("/group/:groupId/add-member", (0, middleware_1.authentication)(), async (req, res, next) => {
    const data = await chat_service_1.chatService.addMembersToGroupChat(req.user._id, (0, objectId_1.toObjectId)(req.params?.groupId), req.body.members);
    return (0, response_1.successResponse)({ res, statusCode: 200, data });
});
router.patch("/group/:groupId/remove-member/:memberId", (0, middleware_1.authentication)(), async (req, res, next) => {
    const data = await chat_service_1.chatService.removeMemberFromGroupChat(req.user._id, (0, objectId_1.toObjectId)(req.params?.groupId), (0, objectId_1.toObjectId)(req.params?.memberId));
    return (0, response_1.successResponse)({ res, statusCode: 200, data });
});
router.patch("/group/:groupId/leave", (0, middleware_1.authentication)(), async (req, res, next) => {
    const data = await chat_service_1.chatService.leaveGroupChat(req.user._id, (0, objectId_1.toObjectId)(req.params?.groupId));
    return (0, response_1.successResponse)({ res, statusCode: 200, data });
});
router.patch("/group/:groupId/delete", (0, middleware_1.authentication)(), async (req, res, next) => {
    const data = await chat_service_1.chatService.deleteGroupChat(req.user._id, (0, objectId_1.toObjectId)(req.params?.groupId));
    return (0, response_1.successResponse)({ res, statusCode: 200, data });
});
exports.default = router;
