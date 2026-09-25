"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMyFriends = exports.getPendingFriendRequestsReceived = exports.getPendingFriendRequestsSent = exports.checkStatus = exports.unfriend = exports.cancelRequest = exports.rejectRequest = exports.acceptRequest = exports.sendRequest = void 0;
const zod_1 = __importDefault(require("zod"));
const validation_1 = require("../../common/validation");
exports.sendRequest = {
    params: zod_1.default.strictObject({
        receiverId: validation_1.generalValidationFields.id
    })
};
exports.acceptRequest = {
    params: zod_1.default.strictObject({
        requestId: validation_1.generalValidationFields.id
    })
};
exports.rejectRequest = exports.acceptRequest;
exports.cancelRequest = exports.acceptRequest;
exports.unfriend = {
    params: zod_1.default.strictObject({
        personId: validation_1.generalValidationFields.id
    })
};
exports.checkStatus = {
    params: zod_1.default.strictObject({
        friendId: validation_1.generalValidationFields.id
    })
};
exports.getPendingFriendRequestsSent = {
    query: zod_1.default.object({
        page: zod_1.default.string().optional().default("1"),
        size: zod_1.default.string().optional().default("10")
    })
};
exports.getPendingFriendRequestsReceived = exports.getPendingFriendRequestsSent;
exports.getMyFriends = exports.getPendingFriendRequestsSent;
