import { createClient, RedisClientType } from "redis";
import { REDIS_URL } from "../../config/config";
import { EmailEnum } from "../enums";
import { Types } from "mongoose";


type BaseKeyType = { email: string, subject: EmailEnum }

export class RedisService {
  private readonly client: RedisClientType;

  constructor() {
    this.client = createClient({ url: REDIS_URL });
    this.handelEvent();
  }

  // ----------------------- handel Event -------------------------------

  private handelEvent() {
    this.client.on("error", (error) => {
      console.error("Error connecting to Redis 🙃:", error);
    });
    this.client.on("ready", () => {
      console.log(`Redis is ready 💗`);
    });
  }

  // ----------------------- Connect -------------------------------

  public async connent() {
    await this.client.connect();
    console.log("Redis_DB connected successfully 👌🌸");
  }

  // ----------------------- Keys -------------------------------

  otpKey ({ email, subject = EmailEnum.ConfirmEmail }: BaseKeyType) : string {
    return `OTP::User::${email}::${subject}`;
  };

  maxRequestOtpKey({ email, subject = EmailEnum.ConfirmEmail }: BaseKeyType): string {
    return `${this.otpKey({ email, subject })}::MaxTrial`;
  }

  blockOtpKey({ email, subject = EmailEnum.ConfirmEmail }: BaseKeyType): string {
    return `${this.otpKey({ email, subject })}::Block`;
  }

   baseRevokeTokenKey (userId:Types.ObjectId | string) : string {
    return `revoked_tokens::${userId.toString()}`;
  }

   revokeTokenKey ({ userId, jti }: {userId:Types.ObjectId | string, jti:string}) : string {
    return `${this.baseRevokeTokenKey(userId)}::${jti}`;
  }

  // ----------------------- Set -------------------------------

  public async set({ key, value, ttl } : {key:string, value:any, ttl?:number}) : Promise<string | null> {
    try {
      value = typeof value === "string" ? JSON.stringify(value) : value;

      return ttl
        ? await this.client.set(key, value, { EX: ttl })
        : await this.client.set(key, value);
      
    } catch (error) {
      console.error("Fail in redis set operation", error);
      return null;
    }
  }

  // ----------------------- Get -------------------------------

  public async get(key: string) : Promise<any> {
    try {
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error("Fail in redis get operation", error);
      return null;
    }
  }

  // ----------------------- Delete -------------------------------

  public async deleteKey(keys: string | string[]) : Promise<number> {
    try {
      if(keys.length === 0) return 0;
      return await this.client.del(keys);
    } catch (error) {
      console.error("Fail in redis delete operation", error);
      return 0;
    }
  }


  // ----------------------- Exists -------------------------------

  public async exists(key: string) : Promise<boolean> {
    try {
      const value = await this.client.exists(key);
      console.log(`Value exists successfully: ${key} = ${value}`);
      return true;
    } catch (error) {
      console.error("Fail in redis exists operation", error);
      return false;
    }
  }

  // ----------------------- Increment -------------------------------

  public async increment(key: string) : Promise<number> {
    try {
      return await this.client.incr(key);
    } catch (error) {
      console.error("Fail in redis increment operation", error);
      return 0;
    }
  }

  // ----------------------- Decrement -------------------------------

  public async decrement(key: string) : Promise<number> {
    try {
      const value = await this.client.decr(key);
      console.log(`Value decremented successfully: ${key} = ${value}`);
      return value;
    } catch (error) {
      console.error("Fail in redis decrement operation", error);
      return 0;
    }
  }

  // ----------------------- ttl -------------------------------

  public async ttl(key: string) : Promise<number> {
    try {
      return await this.client.ttl(key);
    } catch (error) {
      console.error("Fail in redis ttl operation", error);
      return -1;
    }
  }

  // ----------------------- Keys -------------------------------

  public async keys(prefix: string) : Promise<string[]> {
    try {
      return await this.client.keys(`${prefix}*`);
    } catch (error) {
      console.error("Fail in redis keys operation", error);
      return [];
    }
  }

  // ----------------------- Expire -------------------------------

  public async expire(key: string, ttl: number) {
    try {
      return await this.client.expire(key, ttl);
    } catch (error) {
      console.error("Fail in redis expire operation", error);
      return false;
    }
  }

  // ----------------------- Update -------------------------------

  public async update(key: string, value: any, ttl?: number | undefined) {
    try {
      if(!await this.exists(key)) return false;
      return ttl 
        ? await this.client.set(key, value, { EX: ttl })
        : await this.client.set(key, value);
    } catch (error) {
      console.error("Fail in redis update operation", error);
      return false;
    }
  }

  // ----------------------- mGet -------------------------------

  public async mGet(keys: string[]) : Promise<any | null> {
    try {
      return await this.client.mGet(keys);
    } catch (error) {
      console.error("Fail in redis mGet operation", error);
      return null;
    }
  }

  // ------------------------ FCM (Notification) ------------------------

  FCM_key(userId : Types.ObjectId | string) {
  return `user:FCM:${userId.toString()}`;
}

  public async addFCM(userId: Types.ObjectId | string, FCMToken: string) {
  return await this.client.sAdd(this.FCM_key(userId), FCMToken);
}

  public async removeFCM(userId: Types.ObjectId | string, FCMToken: string) {
  return await this.client.sRem(this.FCM_key(userId), FCMToken);
}

  public async getFCMs(userId: Types.ObjectId | string) {
  return await this.client.sMembers(this.FCM_key(userId));
}

  public async hasFCMs(userId: Types.ObjectId | string) {
  return await this.client.sCard(this.FCM_key(userId));
}

  public async removeFCMUser(userId: Types.ObjectId | string) {
  return await this.client.del(this.FCM_key(userId));
}

// ------------------------ Chat ------------------------
  socketKey(userId: Types.ObjectId | string) {
    return `user:sockets:${userId.toString()}`;
  }

  async addSocket(userId: Types.ObjectId | string, socketId: string) {
    return await this.client.sAdd(this.socketKey(userId), socketId);
  }

  async removeSocket(userId: Types.ObjectId | string, socketId: string) {
    return await this.client.sRem(this.socketKey(userId), socketId);
  }

  async getSockets(userId: Types.ObjectId | string) {
    return await this.client.sMembers(this.socketKey(userId));
  }

  async hasSockets(userId: Types.ObjectId | string) {
    return await this.client.sCard(this.socketKey(userId));
  }

  async removeUser(userId: Types.ObjectId | string) {
    return await this.client.del(this.socketKey(userId));
  }




}




export const redisService = new RedisService()