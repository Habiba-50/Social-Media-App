"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserService = void 0;
const config_1 = require("../../config/config");
const exceptions_1 = require("../../common/exceptions");
const services_1 = require("../../common/services");
const enums_1 = require("../../common/enums");
const repository_1 = require("../../DB/repository");
const chat_repository_1 = require("../../DB/repository/chat.repository");
const block_service_1 = require("../block/block.service");
const objectId_1 = require("../../common/utils/objectId");
class UserService {
    userRepository;
    tokenService;
    redisService;
    s3;
    chatRepository;
    blockService;
    constructor() {
        this.userRepository = new repository_1.UserRepository();
        this.tokenService = new services_1.TokenService();
        this.redisService = new services_1.RedisService();
        this.s3 = new services_1.S3Service();
        this.chatRepository = new chat_repository_1.ChatRepository();
        this.blockService = new block_service_1.BlockService();
    }
    async profile(user) {
        const profile = await this.userRepository.findOne({
            filter: { _id: user._id },
        });
        const groups = await this.chatRepository.findAll({
            filter: { participants: { $in: [user._id] }, type: enums_1.ChatEnum.OVM },
            options: {
                populate: {
                    path: "participants",
                    model: "User"
                }
            }
        });
        return { user: profile, groups };
    }
    async profileById(id) {
        const profile = await this.userRepository.findById((0, objectId_1.toObjectId)(id));
        if (!profile) {
            throw new exceptions_1.NotFoundException("User not found");
        }
        return { user: profile };
    }
    async rotateToken(user, { sub, jti, iat }, issuer) {
        if ((iat + config_1.ACCESS_TOKEN_EXPIRY) * 1000 >
            Date.now() + 5 * 60 * 1000) {
            const remainingTime = (iat + config_1.ACCESS_TOKEN_EXPIRY) * 1000 - Date.now();
            throw new exceptions_1.conflictException(`Current access token is still valid, remaining time : ${Math.floor(remainingTime / 60000)} minute`);
        }
        await this.tokenService.createRevokeToken({
            sub: sub,
            jti: jti,
            ttl: iat + config_1.REFRESH_TOKEN_EXPIRY,
        });
        const { access_token, refresh_token } = await this.tokenService.createLoginCredentials({ user, issuer });
        return { access_token, refresh_token };
    }
    async logout(flag, user, { jti, iat, sub }) {
        let status = 200;
        switch (flag) {
            case enums_1.LogoutEnum.ALL:
                user.changeCredentialsTime = new Date();
                await user.save();
                const result = await this.redisService.deleteKey(await this.redisService.keys(this.redisService.baseRevokeTokenKey(sub)));
                console.log("Logout all sessions result:", result);
                break;
            default:
                await this.tokenService.createRevokeToken({
                    sub: sub,
                    jti: jti,
                    ttl: iat + config_1.REFRESH_TOKEN_EXPIRY,
                });
                status = 201;
                break;
        }
        return status;
    }
    async profileImagePresignedUrl(user, { ContentType, Originalname }) {
        const { presignedUrl, Key } = await this.s3.createPresignedUploadLink({
            path: `Users/${user._id.toString()}/Profile`,
            ContentType,
            Originalname,
        });
        return {
            presignedUrl,
            Key
        };
    }
    async confirmProfileImage(user, key) {
        if (!key) {
            throw new exceptions_1.BadRequestException("Key is required");
        }
        const exists = await this.s3.checkAssetExist({ Key: key });
        if (!exists) {
            throw new exceptions_1.BadRequestException("Image does not exist on S3 storage. Please upload the file first.");
        }
        if (user.profilePicture && user.profilePicture !== key) {
            await this.s3.deleteAsset({ Key: user.profilePicture });
        }
        user.profilePicture = key;
        await user.save();
        return user.toJSON();
    }
    async profileCoverImages(user, files) {
        const oldCovers = user.profileCoveredPictures || [];
        const urls = await this.s3.uploadAssets({
            files,
            path: `Users/${user._id.toString()}/Profile/Covers`,
            storageApproach: enums_1.StorageApproachEnum.DISK,
            uploadApproach: enums_1.UploadApproachEnum.SMALL
        });
        console.log("Urls :", urls);
        console.log("Old Covers :", oldCovers);
        const allCovers = [...oldCovers, ...urls];
        if (allCovers.length > 4) {
            const deletedCovers = allCovers.slice(0, allCovers.length - 4);
            await this.s3.deleteAssets({
                Keys: deletedCovers.map((key) => ({
                    Key: key
                }))
            });
            user.profileCoveredPictures = allCovers.slice(-4);
        }
        else {
            user.profileCoveredPictures = allCovers;
        }
        await user.save();
        return user.toJSON();
    }
    async deleteUser(userId, user) {
        const id = userId ? userId : user._id;
        const userToDel = await this.userRepository.findOne({ filter: { _id: id } });
        if (!userToDel) {
            throw new exceptions_1.conflictException("User not found");
        }
        if (userToDel.deletedAt) {
            throw new exceptions_1.conflictException("User already deleted");
        }
        await this.userRepository.updateOne({
            filter: { _id: id },
            update: {
                deletedAt: new Date(),
                $unset: { restoredAt: 1 }
            }
        });
        return true;
    }
    async restoreUser(userId, user) {
        const id = userId ? userId : user._id;
        const userToRestore = await this.userRepository.findOne({ filter: { _id: id } });
        if (!userToRestore) {
            throw new exceptions_1.conflictException("User not found");
        }
        if (!userToRestore.deletedAt) {
            throw new exceptions_1.conflictException("User is not deleted!");
        }
        await this.userRepository.updateOne({
            filter: { _id: id },
            update: {
                $unset: { deletedAt: 1 },
                restoredAt: new Date()
            }
        });
        return true;
    }
    async getAllActiveUsers() {
        const users = await this.userRepository.findAll({ filter: { deletedAt: { $exists: false } } });
        return users;
    }
    async getAllDeletedUsers() {
        const users = await this.userRepository.findAll({ filter: { deletedAt: { $exists: true } } });
        return users;
    }
    async getAllUsers() {
        const users = await this.userRepository.findAll({ filter: {} });
        return users;
    }
    async updateProfile(user, updateData) {
        if (user.deletedAt) {
            throw new exceptions_1.conflictException("Can't update profile of deleted user!");
        }
        const updatedUser = await this.userRepository.updateOne({ filter: { _id: user._id }, update: { $set: updateData } });
        return updatedUser;
    }
    async hardDeleteUser(userId, force) {
        const user = await this.userRepository.findOne({ filter: { _id: userId } });
        if (!user) {
            throw new exceptions_1.conflictException("Invalid Account!");
        }
        if (user.deletedAt || force) {
            const result = await this.userRepository.deleteOne({
                filter: { _id: user._id, ...(force && { force: true }) }
            });
            await this.s3.deleteFolderByPrefix({ Prefix: `Users/${user._id.toString()}` });
            return result.deletedCount > 0;
        }
        else {
            throw new exceptions_1.conflictException("User is not deleted, pass force=true to delete user permanently");
        }
    }
    async searchUsers(user, query) {
        const { search, page, size } = query;
        const blockedIds = await this.blockService.getBlockedUserIds(user._id);
        const result = await this.userRepository.paginate({
            filter: {
                _id: { $ne: user._id, $nin: blockedIds },
                deletedAt: { $exists: false },
                $or: [
                    { firstName: { $regex: search, $options: "i" } },
                    { lastName: { $regex: search, $options: "i" } }
                ]
            },
            projection: { _id: 1, firstName: 1, lastName: 1, profileImage: 1 },
            page,
            size
        });
        return result;
    }
}
exports.UserService = UserService;
exports.default = new UserService();
