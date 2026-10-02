import jwt, { JwtPayload, SignOptions } from "jsonwebtoken";
import { ACCESS_TOKEN_EXPIRY, REFRESH_TOKEN_EXPIRY, SYSTEM_JWT_SECRET, SYSTEM_REFRESH_JWT_SECRET, USER_JWT_SECRET, USER_REFRESH_JWT_SECRET } from "../../config/config";
import { RoleEnum } from "../enums";
import { AudienceEnum, TokenTypeEnum } from "../enums/security.enum";
import { BadRequestException, NotFoundException, unauthorizedException } from "../exceptions";
import { redisService, RedisService } from "./redis.service";
import { UserRepository } from "../../DB/repository";
import { HydratedDocument, Types } from "mongoose";
import { randomUUID } from "crypto";
import { IUser } from "../interfaces";

export class TokenService {

    private redis: RedisService;
    private userRepository: UserRepository;

    constructor() {
        this.redis = redisService;
        this.userRepository = new UserRepository();
    }

    // ------------------------------ Generate Token ---------------------------------

    async signToken({
        payload,
        secretKey = USER_JWT_SECRET,
        options
    }: {
        payload: object | string,
        secretKey?: string,
        options?: SignOptions
    }): Promise<string> {

        return jwt.sign(payload, secretKey, options)
    }


    // ------------------------------ Verify Token ---------------------------------

    async verifyToken({
        token,
        secretKey = USER_JWT_SECRET,
    }: {
        token: string,
        secretKey?: string,
    }): Promise<JwtPayload> {
        return jwt.verify(token, secretKey) as JwtPayload;
    }



    // ------------------------------Get Token Signature----------------------------------

    async getTokenSignature(role: RoleEnum) {
        let accessSignature: string;
        let refreshSignature: string;
        let audience: AudienceEnum;

        switch (role) {
            case RoleEnum.ADMIN:
                accessSignature = SYSTEM_JWT_SECRET;
                refreshSignature = SYSTEM_REFRESH_JWT_SECRET;
                audience = AudienceEnum.SYSTEM;
                break;
            default:
                accessSignature = USER_JWT_SECRET;
                refreshSignature = USER_REFRESH_JWT_SECRET;
                audience = AudienceEnum.USER;
                break;
        }

        return { accessSignature, refreshSignature, audience };
    }

    // ------------------------------Create login credentials ---------------------
    public async createLoginCredentials({ user, issuer }: { user: any, issuer: string }): Promise<{
        access_token: string;
        refresh_token: string;
    }> {
        const { accessSignature, refreshSignature, audience } = await this.getTokenSignature(user.role);

        const jwtId = randomUUID();

        const access_token = await this.signToken({
            payload: { sub: user._id },
            secretKey: accessSignature,
            options: {
                issuer,
                audience: [TokenTypeEnum.ACCESS, audience],
                expiresIn: ACCESS_TOKEN_EXPIRY,
                jwtid: jwtId,
            },
        });

        const refresh_token = await this.signToken({
            payload: { sub: user._id },
            secretKey: refreshSignature,
            options: {
                issuer,
                audience: [TokenTypeEnum.REFRESH, audience],
                expiresIn: REFRESH_TOKEN_EXPIRY,
                jwtid: jwtId,
            }
        })

        return { access_token, refresh_token };

    }

    //------------------------------Decode Token----------------------------------

    async decodeToken(token: string, allowedTokenType?: TokenTypeEnum[]): Promise<{
        user: HydratedDocument<IUser>;
        decoded: JwtPayload;
    }> {

        const decoded = jwt.decode(token);
        // console.log({ decoded });

        if (typeof decoded === "string" || !decoded || !Array.isArray(decoded.aud) || !decoded.aud.length) {
            throw new BadRequestException("fail to decode token, aud is required")
        }

        const [tokenType, audience] = decoded.aud as [TokenTypeEnum, AudienceEnum];


        if (!Object.values(TokenTypeEnum).includes(tokenType)) {
            throw new BadRequestException("Invalid token")
        }

        if (!Object.values(AudienceEnum).includes(audience)) {
            throw new BadRequestException("Invalid token")
        }

        if (allowedTokenType?.length && !allowedTokenType.includes(tokenType)) {
            throw new NotFoundException("Invalid token type")
        }

        if (decoded.jti && decoded.sub && await this.redis.get(this.redis.revokeTokenKey({ userId: decoded.sub, jti: decoded.jti }))) {
            throw new unauthorizedException("Invalid login session")
        }
        let signature = undefined;

        switch (tokenType) {
            case TokenTypeEnum.ACCESS:
                signature = audience === AudienceEnum.SYSTEM ? SYSTEM_JWT_SECRET : USER_JWT_SECRET
                break;
            case TokenTypeEnum.REFRESH:
                signature = audience === AudienceEnum.SYSTEM ? SYSTEM_REFRESH_JWT_SECRET : USER_REFRESH_JWT_SECRET
                break;
        }


        const verifyData = await this.verifyToken({ token, secretKey: signature });

        // console.log({ verifyData });

        if (!verifyData.sub) {
            throw new BadRequestException("Invalid token payload, sub is missing");
        }

        const user = await this.userRepository.findById({
            _id: new Types.ObjectId(verifyData.sub),
        });

        if (!user) {
            throw new NotFoundException("No registered account found");
        }

        // console.log({changeCredentialsTime : user.changeCredentialsTime.getTime() , iat : decoded.iat * 1000});

        if (
            user.changeCredentialsTime && decoded.iat &&
            user.changeCredentialsTime?.getTime() > decoded.iat * 1000) {
            throw new unauthorizedException("Invalid login session");
        }

        return { user, decoded };

    }

    public async createRevokeToken({ sub, jti, ttl }: { sub: string, jti: string, ttl: number }) {
        await this.redis.set({
            key: this.redis.revokeTokenKey({ userId: sub, jti }),
            value: jti,
            ttl
        });
    }


}

export const tokenService = new TokenService();
