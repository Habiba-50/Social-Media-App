"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const google_auth_library_1 = require("google-auth-library");
const enums_1 = require("../../common/enums");
const exceptions_1 = require("../../common/exceptions");
const services_1 = require("../../common/services");
const utils_1 = require("../../common/utils");
const email_1 = require("../../common/utils/email");
const security_1 = require("../../common/utils/security");
const repository_1 = require("../../DB/repository");
const config_1 = require("../../config/config");
const notification_1 = require("../notification");
class AuthenticationService {
    userRepository;
    redis;
    tokenService;
    notificationService;
    notificationServiceModule;
    constructor() {
        this.userRepository = new repository_1.UserRepository();
        this.redis = services_1.redisService;
        this.tokenService = new services_1.TokenService();
        this.notificationService = new services_1.NotificationService();
        this.notificationServiceModule = new notification_1.NotificationModuleService();
    }
    async sendEmailOtp(email, subject = enums_1.EmailEnum.ConfirmEmail, title) {
        const isBlocked = await this.redis.get(this.redis.blockOtpKey({ email, subject }));
        if (isBlocked) {
            const remainingTime = await this.redis.ttl(this.redis.blockOtpKey({ email, subject }));
            if (remainingTime > 0) {
                throw new exceptions_1.conflictException(`OTP already sent, please try again after ${remainingTime} seconds`);
            }
        }
        const maxTrialCount = await this.redis.get(this.redis.maxRequestOtpKey({ email, subject }));
        if (maxTrialCount >= 3) {
            await this.redis.set({
                key: this.redis.blockOtpKey({ email, subject }),
                value: 1,
                ttl: 300,
            });
            throw new exceptions_1.conflictException(`You have reached max request trial count please try again later after 5 minutes`);
        }
        const existingOtp = await this.redis.get(this.redis.otpKey({ email, subject }));
        if (existingOtp) {
            const remainingTime = await this.redis.ttl(this.redis.otpKey({ email, subject }));
            if (remainingTime > 0) {
                throw new exceptions_1.conflictException(`OTP already sent, please try again after ${remainingTime} seconds`);
            }
        }
        const code = await (0, utils_1.createNumberOtp)();
        await this.redis.set({
            key: this.redis.otpKey({ email, subject }),
            value: await (0, security_1.generateHash)({ plaintext: `${code}` }),
            ttl: 120,
        });
        await (0, email_1.sendEmail)({
            to: email,
            subject: title,
            html: (0, email_1.emailTemplate)({ code, title }),
        });
        maxTrialCount > 0 ?
            await this.redis.increment(this.redis.maxRequestOtpKey({ email, subject }))
            : await this.redis.set({ key: this.redis.maxRequestOtpKey({ email, subject }), value: 1, ttl: 300 });
    }
    async signup({ username, email, password, phone }) {
        const checkUserExist = await this.userRepository.findOne({
            filter: { email },
            projection: "email",
            options: {
                lean: true,
            }
        });
        if (checkUserExist) {
            throw new exceptions_1.conflictException("Email already exists");
        }
        const user = await this.userRepository.create({
            data: {
                username,
                email,
                password,
                phone,
                provider: enums_1.ProviderEnum.SYSTEM,
            },
        });
        email_1.emailEmitter.emit("send-email", async () => {
            await this.sendEmailOtp(email, enums_1.EmailEnum.ConfirmEmail, "Confirm-Email");
        });
        return user;
    }
    async confirmEmail({ email, otp }) {
        const account = await this.userRepository.findOne({
            filter: { email, confirmEmail: { $exists: false }, provider: enums_1.ProviderEnum.SYSTEM },
        });
        if (!account) {
            throw new exceptions_1.NotFoundException("Invalid Account");
        }
        const hashedOtp = await this.redis.get(this.redis.otpKey({ email, subject: enums_1.EmailEnum.ConfirmEmail }));
        if (!hashedOtp) {
            throw new exceptions_1.NotFoundException("OTP expired");
        }
        if (!(await (0, security_1.compareHash)(`${otp}`, hashedOtp))) {
            throw new exceptions_1.conflictException("Invalid OTP");
        }
        account.confirmEmail = new Date();
        await account.save();
        await this.redis.deleteKey(await this.redis.keys(this.redis.otpKey({ email, subject: enums_1.EmailEnum.ConfirmEmail })));
    }
    ;
    async resendOtp({ email }) {
        const user = await this.userRepository.findOne({
            filter: { email, provider: enums_1.ProviderEnum.SYSTEM },
        });
        if (!user) {
            throw new exceptions_1.NotFoundException("Fail to find matching account");
        }
        if (user.confirmEmail) {
            throw new exceptions_1.conflictException("Email already verified");
        }
        await this.sendEmailOtp(email, enums_1.EmailEnum.ConfirmEmail, "Confirm-Email");
    }
    ;
    async verifyGoogleAccount(idToken) {
        const client = new google_auth_library_1.OAuth2Client();
        const ticket = await client.verifyIdToken({
            idToken: idToken,
            audience: config_1.WEB_CLIENT_ID,
        });
        const payload = ticket.getPayload();
        if (!payload?.email_verified) {
            throw new exceptions_1.NotFoundException("fail to verify this account with google");
        }
        return payload;
    }
    async signupGmail(idToken, issuer) {
        const payload = await this.verifyGoogleAccount(idToken);
        console.log(payload);
        const checkUser = await this.userRepository.findOne({
            filter: { email: payload?.email },
            projection: "email provider",
            options: {
                lean: true,
            }
        });
        if (checkUser) {
            if (checkUser.provider !== enums_1.ProviderEnum.GOOGLE) {
                throw new exceptions_1.conflictException("Account already exists with different provider");
            }
            else {
                const account = await this.loginGmail(idToken, issuer);
                return { account, status: 200 };
            }
        }
        const newUser = await this.userRepository.create({
            data: {
                firstName: payload?.given_name,
                lastName: payload?.family_name,
                email: payload?.email,
                provider: enums_1.ProviderEnum.GOOGLE,
                profilePicture: payload?.picture,
                confirmEmail: new Date()
            },
        });
        return await this.tokenService.createLoginCredentials({ user: newUser, issuer });
    }
    ;
    async login(inputs, issuer) {
        const { email, password, fcm } = inputs;
        const user = await this.userRepository.findOne({
            filter: { email, provider: enums_1.ProviderEnum.SYSTEM },
        });
        console.log("User: ", user);
        if (!user) {
            throw new exceptions_1.NotFoundException("Fail to find matching account");
        }
        if (!user.confirmEmail) {
            throw new exceptions_1.conflictException("Email not verified");
        }
        if (!(await (0, security_1.compareHash)(password, user.password))) {
            throw new exceptions_1.conflictException("Invalid password");
        }
        if (fcm) {
            await this.redis.addFCM(user._id, fcm);
            const tokens = await this.redis.getFCMs(user._id);
            if (tokens?.length > 1) {
                await this.notificationService.sendNotifications({
                    userId: user._id.toString(),
                    tokens: tokens,
                    title: `${user.username} Login`,
                    body: `New login at ${new Date()}`,
                    entityId: user._id.toString(),
                    entityType: "User",
                    senderId: user._id.toString(),
                    type: String(enums_1.NotificationType.NEW_LOGIN)
                });
            }
            await this.notificationService.sendNotification({
                userId: user._id.toString(),
                token: fcm,
                title: `${user.username} Login`,
                body: `New login at ${new Date()}`,
                entityId: user._id.toString(),
                entityType: "User",
                senderId: user._id.toString(),
                type: String(enums_1.NotificationType.NEW_LOGIN),
            });
        }
        const credentials = await this.tokenService.createLoginCredentials({ user, issuer });
        await this.notificationServiceModule.createNotification({
            title: "New Login",
            body: `New login at ${new Date()}`,
            senderId: user._id,
            receiverId: user._id,
            type: enums_1.NotificationType.NEW_LOGIN,
        });
        return credentials;
    }
    ;
    async loginGmail(idToken, issuer) {
        const payload = await this.verifyGoogleAccount(idToken);
        const user = await this.userRepository.findOne({
            filter: { email: payload?.email, provider: enums_1.ProviderEnum.GOOGLE },
        });
        if (user?.provider !== enums_1.ProviderEnum.GOOGLE) {
            throw new exceptions_1.conflictException("Account already exists with different provider");
        }
        return await this.tokenService.createLoginCredentials({ user, issuer });
    }
    ;
    async forgetPassword(email) {
        const user = await this.userRepository.findOne({
            filter: {
                email,
                provider: enums_1.ProviderEnum.SYSTEM,
                confirmEmail: { $exists: true }
            },
        });
        if (!user) {
            throw new exceptions_1.NotFoundException("Fail to find matching account");
        }
        await this.sendEmailOtp(email, enums_1.EmailEnum.ForgotPassword, "Reset-Code");
    }
    async verifyForgetPasswordOtp(email, otp) {
        const hashOtp = await this.redis.get(this.redis.otpKey({ email, subject: enums_1.EmailEnum.ForgotPassword }));
        console.log(hashOtp);
        if (!hashOtp) {
            throw new exceptions_1.NotFoundException("OTP expired");
        }
        if (!(await (0, security_1.compareHash)(`${otp}`, hashOtp))) {
            throw new exceptions_1.conflictException("Invalid OTP");
        }
    }
    async resetPassword(email, newPassword) {
        const user = await this.userRepository.findOneAndUpdate({
            filter: {
                email,
                provider: enums_1.ProviderEnum.SYSTEM,
                confirmEmail: { $exists: true }
            },
            update: {
                password: await (0, security_1.generateHash)({ plaintext: newPassword }),
                changeCredentialsTime: new Date()
            },
        });
        if (!user) {
            throw new exceptions_1.NotFoundException("User not found");
        }
        console.log(user.id);
        const tokenKeys = await this.redis.keys(this.redis.baseRevokeTokenKey(user.id));
        const otpKeys = await this.redis.keys(this.redis.otpKey({ email, subject: enums_1.EmailEnum.ForgotPassword }));
        await this.redis.deleteKey([...tokenKeys, ...otpKeys]);
        return;
    }
}
exports.default = new AuthenticationService();
