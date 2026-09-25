import { OAuth2Client } from "google-auth-library";
import { EmailEnum, NotificationType, ProviderEnum } from "../../common/enums";
import { conflictException, NotFoundException } from "../../common/exceptions";
import { NotificationService, RedisService, redisService, TokenService } from "../../common/services";
import { createNumberOtp } from "../../common/utils";
import { emailEmitter, emailTemplate, sendEmail } from "../../common/utils/email";
import { compareHash, generateHash } from "../../common/utils/security";
import { UserRepository } from "../../DB/repository";
import { LoginDto, SignupDto } from "./auth.dto";
import { WEB_CLIENT_ID } from "../../config/config";
import { NotificationModuleService } from "../notification";


class AuthenticationService {

    private userRepository: UserRepository;
    private redis: RedisService;
    private tokenService: TokenService;
    private notificationService: NotificationService;
    private notificationServiceModule: NotificationModuleService;



    constructor() {
        this.userRepository = new UserRepository()
        this.redis = redisService
        this.tokenService = new TokenService()
        this.notificationService = new NotificationService()
        this.notificationServiceModule = new NotificationModuleService()
    }

    // public login (data: LoginDto): any { 
    //     // data.email ;
    //     // return data
    // }


    // -----------------------------Send Email OTP-----------------------------


    private async sendEmailOtp(email: string, subject: EmailEnum = EmailEnum.ConfirmEmail, title: string): Promise<void> {

        // Check Block Condition
        const isBlocked = await this.redis.get(this.redis.blockOtpKey({ email, subject }));
        if (isBlocked) {
            const remainingTime = await this.redis.ttl(this.redis.blockOtpKey({ email, subject }));
            if (remainingTime > 0) {
                throw new conflictException(`OTP already sent, please try again after ${remainingTime} seconds`);
            }
        }

        // Check Max Trials
        const maxTrialCount = await this.redis.get(this.redis.maxRequestOtpKey({ email, subject }));
        if (maxTrialCount >= 3) {
            await this.redis.set({
                key: this.redis.blockOtpKey({ email, subject }),
                value: 1,
                ttl: 300,
            });
            throw new conflictException(`You have reached max request trial count please try again later after 5 minutes`);
        }

        // check there is a valid otp
        const existingOtp = await this.redis.get(this.redis.otpKey({ email, subject }));
        if (existingOtp) {
            const remainingTime = await this.redis.ttl(this.redis.otpKey({ email, subject }));
            if (remainingTime > 0) {
                throw new conflictException(`OTP already sent, please try again after ${remainingTime} seconds`);
            }
        }

        // Generate and Set OTP 
        const code = await createNumberOtp();

        await this.redis.set({
            key: this.redis.otpKey({ email, subject }),
            value: await generateHash({ plaintext: `${code}` }),
            ttl: 120,
        });


        // Send Email
        await sendEmail({
            to: email,
            subject: title,
            html: emailTemplate({ code, title }),
        });


        // Increment Trials Count
        maxTrialCount > 0 ?
            await this.redis.increment(this.redis.maxRequestOtpKey({ email, subject }))
            : await this.redis.set({ key: this.redis.maxRequestOtpKey({ email, subject }), value: 1, ttl: 300 })

    }


    // ----------------------------Signup--------------------------------
    public async signup({ username, email, password, phone }: SignupDto): Promise<any> {

        const checkUserExist = await this.userRepository.findOne({
            filter: { email },
            projection: "email",
            options: {
                lean: true,
            }
        });
        // console.log(checkUserExist);

        if (checkUserExist) {
            throw new conflictException("Email already exists");
        }

        // const otp = generateOTP();
        // const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

        const user = await this.userRepository.create({
            data: {
                username,
                email,
                password,
                phone,
                provider: ProviderEnum.SYSTEM,
                // otpCode: await generateHash(otp),
                // otpExpiresAt: expiresAt,
            },
        });

        emailEmitter.emit("send-email", async () => {
            await this.sendEmailOtp(email, EmailEnum.ConfirmEmail, "Confirm-Email");
        })

        return user;

    }


    // ----------------------------Confirm Email--------------------------------

    public async confirmEmail({ email, otp }: { email: string, otp: number }): Promise<void> {

        const account = await this.userRepository.findOne({
            filter: { email, confirmEmail: { $exists: false }, provider: ProviderEnum.SYSTEM },
        });



        if (!account) {
            throw new NotFoundException("Invalid Account");
        }

        const hashedOtp = await this.redis.get(this.redis.otpKey({ email, subject: EmailEnum.ConfirmEmail }));
        // console.log(hashOtp);
        if (!hashedOtp) {
            throw new NotFoundException("OTP expired");
        }
        if (!(await compareHash(`${otp}`, hashedOtp))) {
            throw new conflictException("Invalid OTP");
        }


        account.confirmEmail = new Date();
        await account.save();
        await this.redis.deleteKey(await this.redis.keys(this.redis.otpKey({ email, subject: EmailEnum.ConfirmEmail })));
        // await deleteKey(otpKey({ email }) , otpMaxRequestKey(email) , otpBlockKey(email));

        // return account;
    };

    // ----------------------------Resend OTP--------------------------------

    public async resendOtp({ email }: { email: string }): Promise<void> {

        const user = await this.userRepository.findOne({
            filter: { email, provider: ProviderEnum.SYSTEM },

        });

        if (!user) {
            throw new NotFoundException("Fail to find matching account");
        }

        // console.log(user);

        if (user.confirmEmail) {
            throw new conflictException("Email already verified");
        }

        // await checkOtpKey(otpKey({email , type:EmailEnum.ConfirmEmail}))

        await this.sendEmailOtp(email, EmailEnum.ConfirmEmail, "Confirm-Email");

        // return user;

    };

    // -----------------------------Verify google account --------------------------------

    private async verifyGoogleAccount(idToken: string): Promise<any> {
        const client = new OAuth2Client();

        const ticket = await client.verifyIdToken({
            idToken: idToken as string,
            audience: WEB_CLIENT_ID as string,
        });
        const payload = ticket.getPayload();
        // console.log(payload);

        if (!payload?.email_verified) {
            throw new NotFoundException("fail to verify this account with google");
        }

        return payload
    }

    // ----------------------------Signup Gmail--------------------------------

    public async signupGmail(idToken: string, issuer: string): Promise<any> {

        const payload = await this.verifyGoogleAccount(idToken)

        console.log(payload);

        const checkUser = await this.userRepository.findOne({
            filter: { email: payload?.email },
            projection: "email provider",
            options: {
                lean: true,
            }
        });

        // console.log(checkUser);

        if (checkUser) {
            if (checkUser.provider !== ProviderEnum.GOOGLE) {
                throw new conflictException("Account already exists with different provider");
            } else {
                const account = await this.loginGmail(idToken, issuer);
                return { account, status: 200 }
            }

        }

        const newUser = await this.userRepository.create({
            data: {
                firstName: payload?.given_name,
                lastName: payload?.family_name,
                email: payload?.email,
                provider: ProviderEnum.GOOGLE,
                profilePicture: payload?.picture,
                confirmEmail: new Date()
            },
        });
        // console.log(newUser);

        return await this.tokenService.createLoginCredentials({ user: newUser, issuer });
    };


    // ----------------------------Login--------------------------------

    public async login(inputs: LoginDto, issuer: string): Promise<{ access_token: string, refresh_token: string }> {

        const { email, password, fcm } = inputs
        const user = await this.userRepository.findOne({
            filter: { email, provider: ProviderEnum.SYSTEM },
        });
        console.log("User: ", user);

        if (!user) {
            throw new NotFoundException("Fail to find matching account");
        }

        if (!user.confirmEmail) {
            throw new conflictException("Email not verified");
        }

        if (!(await compareHash(password, user.password))) {
            throw new conflictException("Invalid password");
        }

        if (fcm) {
            // console.log("FCM Token: ", fcm);
            await this.redis.addFCM(user._id as unknown as string, fcm);
            const tokens = await this.redis.getFCMs(user._id as unknown as string);
            // console.log("FCM Tokens: ", tokens);
            // console.log("User ID: ", user._id);
            if (tokens?.length > 1) {
                await this.notificationService.sendNotifications({
                    userId: user._id.toString(),
                    tokens: tokens,
                    title: `${user.username} Login`,
                    body: `New login at ${new Date()}`,
                    entityId: user._id.toString(),
                    entityType: "User",
                    senderId: user._id.toString(),
                    type: String(NotificationType.NEW_LOGIN)
                    // Firebase not support NotificationType enum
                })

                // console.log("Multiple login notification sent successfully");
            }

            await this.notificationService.sendNotification({
                userId: user._id.toString(),
                token: fcm,
                title: `${user.username} Login`,
                body: `New login at ${new Date()}`,
                entityId: user._id.toString(),
                entityType: "User",
                senderId: user._id.toString(),
                type: String(NotificationType.NEW_LOGIN),
                // Firebase not support NotificationType enum
            })

            // console.log("Single login notification sent successfully");

        }

        const credentials = await this.tokenService.createLoginCredentials({ user, issuer });
        // console.log("Credentials: ", credentials);

        await this.notificationServiceModule.createNotification({
            title: "New Login",
            body: `New login at ${new Date()}`,
            senderId: user._id,
            receiverId: user._id,
            type: NotificationType.NEW_LOGIN,
        });

        return credentials;

    };

    // -----------------------------Login Gmail-------------------------------

    public async loginGmail(idToken: string, issuer: string): Promise<any> {

        const payload = await this.verifyGoogleAccount(idToken)

        const user = await this.userRepository.findOne({
            filter: { email: payload?.email, provider: ProviderEnum.GOOGLE },
        });

        if (user?.provider as ProviderEnum !== ProviderEnum.GOOGLE) {
            throw new conflictException("Account already exists with different provider");
        }


        return await this.tokenService.createLoginCredentials({ user, issuer });
    };

    // -------------------------------Forget Password------------------------------

    // 1 - Send Forgot Password OTP
    public async forgetPassword(email: string): Promise<void> {

        const user = await this.userRepository.findOne({
            filter: {
                email,
                provider: ProviderEnum.SYSTEM,
                confirmEmail: { $exists: true }
            },
        });

        if (!user) {
            throw new NotFoundException("Fail to find matching account");
        }

        await this.sendEmailOtp(email, EmailEnum.ForgotPassword, "Reset-Code");

    }


    // 2 - Verify Forgot Password OTP
    public async verifyForgetPasswordOtp(email: string, otp: string): Promise<void> {
        const hashOtp = await this.redis.get(this.redis.otpKey({ email, subject: EmailEnum.ForgotPassword }));
        console.log(hashOtp);
        if (!hashOtp) {
            throw new NotFoundException("OTP expired");
        }
        if (!(await compareHash(`${otp}`, hashOtp))) {
            throw new conflictException("Invalid OTP");
        }

    }

    // 3 - Reset Password
    public async resetPassword(email: string, newPassword: string): Promise<void> {

        const user = await this.userRepository.findOneAndUpdate({
            filter: {
                email,
                provider: ProviderEnum.SYSTEM,
                confirmEmail: { $exists: true }
            },
            update: {
                password: await generateHash({ plaintext: newPassword }),
                changeCredentialsTime: new Date()
            },
        });

        if (!user) {
            throw new NotFoundException("User not found");
        }
        console.log(user.id)

        const tokenKeys = await this.redis.keys(this.redis.baseRevokeTokenKey(user.id));
        const otpKeys = await this.redis.keys(this.redis.otpKey({ email, subject: EmailEnum.ForgotPassword }));

        await this.redis.deleteKey([...tokenKeys, ...otpKeys]);
        return;
    }
}

export default new AuthenticationService();



