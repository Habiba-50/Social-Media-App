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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const middleware_1 = require("../../middleware");
const response_1 = require("../../common/response");
const user_service_1 = __importDefault(require("./user.service"));
const user_authorization_1 = require("./user.authorization");
const enums_1 = require("../../common/enums");
const multer_1 = require("../../common/utils/multer");
const chat_1 = require("../chat");
const validators = __importStar(require("./user.validation"));
const router = (0, express_1.Router)();
router.use("/:userId/chat", chat_1.chatRouter);
router.use("/chat", chat_1.chatRouter);
router.get("/", (0, middleware_1.authentication)(), (0, middleware_1.authorization)(user_authorization_1.userAuthorization.profile), async (req, res, next) => {
    const data = await user_service_1.default.profile(req.user);
    return (0, response_1.successResponse)({ res, statusCode: 200, data });
});
router.get("/:userId", (0, middleware_1.authentication)(), async (req, res, next) => {
    const data = await user_service_1.default.profileById(req.params?.userId);
    return (0, response_1.successResponse)({ res, statusCode: 200, data });
});
router.post("/rotate-token", (0, middleware_1.authentication)(enums_1.TokenTypeEnum.REFRESH), async (req, res, next) => {
    const data = await user_service_1.default.rotateToken(req.user, req.decoded, `${req.protocol}://${req.host}`);
    return (0, response_1.successResponse)({ res, statusCode: 200, data });
});
router.post("/logout", (0, middleware_1.authentication)(), async (req, res, next) => {
    const status = await user_service_1.default.logout(req.body.flag, req.user, req.decoded);
    return (0, response_1.successResponse)({ res, statusCode: status, data: { message: "Logged out successfully" } });
});
router.patch("/profile-image-URL", (0, middleware_1.authentication)(), async (req, res, next) => {
    const data = await user_service_1.default.profileImagePresignedUrl(req.user, req.body);
    return (0, response_1.successResponse)({ res, data });
});
router.patch("/profile-image/confirm", (0, middleware_1.authentication)(), async (req, res, next) => {
    const data = await user_service_1.default.confirmProfileImage(req.user, req.body.key || req.body.Key);
    return (0, response_1.successResponse)({ res, data });
});
router.patch("/cover-images", (0, middleware_1.authentication)(), (0, multer_1.cloudFileUpload)({
    validation: multer_1.fileFieldValidation.image,
    storageApproach: enums_1.StorageApproachEnum.DISK,
}).array("attachments", 2), async (req, res, next) => {
    const data = await user_service_1.default.profileCoverImages(req.user, req.files);
    return (0, response_1.successResponse)({ res, data });
});
router.delete("/delete/{:userId}", (0, middleware_1.authentication)(), (0, middleware_1.authorization)(user_authorization_1.userAuthorization.profile), async (req, res, next) => {
    const data = await user_service_1.default.deleteUser(req.params?.userId, req.user);
    return (0, response_1.successResponse)({ res, statusCode: 200, message: "User deleted successfully", data });
});
router.patch("/restore/{:userId}", (0, middleware_1.authentication)(), (0, middleware_1.authorization)(user_authorization_1.userAuthorization.profile), async (req, res, next) => {
    const data = await user_service_1.default.restoreUser(req.params?.userId, req.user);
    return (0, response_1.successResponse)({ res, statusCode: 200, message: "User restored successfully", data });
});
router.get("/all", (0, middleware_1.authentication)(), (0, middleware_1.authorization)(user_authorization_1.userAuthorization.getAllUsers), async (req, res, next) => {
    const data = await user_service_1.default.getAllUsers();
    return (0, response_1.successResponse)({ res, statusCode: 200, data });
});
router.get("/deleted", (0, middleware_1.authentication)(), (0, middleware_1.authorization)(user_authorization_1.userAuthorization.getAllUsers), async (req, res, next) => {
    const data = await user_service_1.default.getAllDeletedUsers();
    return (0, response_1.successResponse)({ res, statusCode: 200, data });
});
router.get("/active", (0, middleware_1.authentication)(), (0, middleware_1.authorization)(user_authorization_1.userAuthorization.getAllUsers), async (req, res, next) => {
    const data = await user_service_1.default.getAllActiveUsers();
    return (0, response_1.successResponse)({ res, statusCode: 200, data });
});
router.patch("/update", (0, middleware_1.authentication)(), async (req, res, next) => {
    const data = await user_service_1.default.updateProfile(req.user, req.body);
    return (0, response_1.successResponse)({ res, statusCode: 200, data });
});
router.delete("/destroy/:userId/{permanent}", (0, middleware_1.authentication)(), (0, middleware_1.authorization)(user_authorization_1.userAuthorization.getAllUsers), async (req, res, next) => {
    const force = req.query.force === "true";
    await user_service_1.default.hardDeleteUser(req.params.userId, force);
    return (0, response_1.successResponse)({ res, statusCode: 200, message: "User deleted successfully" });
});
router.get("/searchUser", (0, middleware_1.authentication)(), (0, middleware_1.validation)(validators.searchUserValidation), async (req, res, next) => {
    const { search, page, size } = req.query;
    const data = await user_service_1.default.searchUsers(req.user, {
        search: search,
        page: page ? Number(page) : 1,
        size: size ? Number(size) : 10
    });
    return (0, response_1.successResponse)({ res, statusCode: 200, data });
});
exports.default = router;
