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
const middleware_1 = require("../../middleware");
const response_1 = require("../../common/response");
const multer_1 = require("../../common/utils/multer");
const validators = __importStar(require("./comment.validation"));
const comment_service_1 = require("./comment.service");
const router = (0, express_1.Router)({ mergeParams: true });
router.post("/", (0, middleware_1.authentication)(), (0, multer_1.cloudFileUpload)({
    validation: multer_1.fileFieldValidation.image,
}).array("attachments", 2), (0, middleware_1.validation)(validators.createComment), async (req, res, next) => {
    const data = await comment_service_1.commentService.createComment(req.params, {
        ...req.body,
        files: req.files,
    }, req.user);
    return (0, response_1.successResponse)({
        res,
        statusCode: 201,
        message: "Comment created successfully",
        data,
    });
});
router.post("/:commentId/reply", (0, middleware_1.authentication)(), (0, multer_1.cloudFileUpload)({
    validation: multer_1.fileFieldValidation.image,
}).array("attachments", 2), (0, middleware_1.validation)(validators.replyOnComment), async (req, res, next) => {
    const data = await comment_service_1.commentService.replyOnComment(req.params, {
        ...req.body,
        files: req.files,
    }, req.user);
    return (0, response_1.successResponse)({
        res,
        statusCode: 201,
        message: "Reply on comment created successfully",
        data,
    });
});
router.patch("/:commentId", (0, middleware_1.authentication)(), (0, multer_1.cloudFileUpload)({
    validation: multer_1.fileFieldValidation.image,
}).array("attachments", 2), (0, middleware_1.validation)(validators.replyOnComment), async (req, res, next) => {
    const data = await comment_service_1.commentService.updateComment(req.params, {
        ...req.body,
        files: req.files,
    }, req.user);
    return (0, response_1.successResponse)({
        res,
        statusCode: 200,
        message: "Comment updated successfully",
        data,
    });
});
router.delete("/:commentId", (0, middleware_1.authentication)(), (0, middleware_1.validation)(validators.deleteComment), async (req, res, next) => {
    const data = await comment_service_1.commentService.deleteComment(req.params, req.user);
    return (0, response_1.successResponse)({ res, statusCode: 200, data });
});
router.patch("/:commentId/restore", (0, middleware_1.authentication)(), (0, middleware_1.validation)(validators.deleteComment), async (req, res, next) => {
    const data = await comment_service_1.commentService.restoreComment(req.params, req.user);
    return (0, response_1.successResponse)({ res, statusCode: 200, data });
});
router.patch('/:commentId/react', (0, middleware_1.authentication)(), (0, middleware_1.validation)(validators.reactComment), async (req, res, next) => {
    console.log(req.query.react);
    const data = await comment_service_1.commentService.reactComment(req.params, req.query, req.user);
    return (0, response_1.successResponse)({ res, statusCode: 200, data });
});
router.patch('/:commentId/reply/:replyId/react', (0, middleware_1.authentication)(), (0, middleware_1.validation)(validators.reactReply), async (req, res, next) => {
    const data = await comment_service_1.commentService.reactReply(req.params, req.query, req.user);
    return (0, response_1.successResponse)({ res, statusCode: 200, data });
});
router.delete('/:commentId/destroy', (0, middleware_1.authentication)(), (0, middleware_1.validation)(validators.deleteComment), async (req, res, next) => {
    const data = await comment_service_1.commentService.destroyComment(req.params, req.user);
    return (0, response_1.successResponse)({ res, statusCode: 200, data });
});
router.get("/:commentId", (0, middleware_1.authentication)(), (0, middleware_1.validation)(validators.getComment), async (req, res, next) => {
    const data = await comment_service_1.commentService.getComments(req.params);
    return (0, response_1.successResponse)({ res, statusCode: 200, data });
});
exports.default = router;
