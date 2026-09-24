"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationModel = void 0;
const mongoose_1 = require("mongoose");
const index_1 = require("../../common/enums/index");
const notificationSchema = new mongoose_1.Schema({
    title: {
        type: String,
        required: true
    },
    body: {
        type: String,
        required: true
    },
    senderId: {
        type: mongoose_1.Types.ObjectId,
        required: true,
        ref: "User",
    },
    receiverId: {
        type: mongoose_1.Types.ObjectId,
        required: true
    },
    isRead: {
        type: Boolean,
        default: false,
    },
    type: {
        type: String,
        enum: index_1.NotificationType,
        required: true,
    },
    referenceId: {
        type: mongoose_1.Types.ObjectId,
        refPath: "onModel"
    },
    onModel: {
        type: String,
        enum: ["Post", "Comment", "User", "FriendRequest", "Chat"],
    },
    isDeleted: {
        type: Boolean,
    },
}, {
    timestamps: true,
    collection: 'SOCIAL_MEDIA_APP_NOTIFICATIONS',
    strict: true,
    strictQuery: true,
});
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 });
exports.NotificationModel = mongoose_1.models.Notification || (0, mongoose_1.model)('Notification', notificationSchema);
