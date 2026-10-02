import admin from "firebase-admin";
import { Types } from "mongoose";
import { redisService, RedisService } from "./redis.service";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export class NotificationService {

    private client: admin.app.App;
    private redis: RedisService;
    
    constructor() {
        this.redis = redisService

        const serviceAccount = JSON.parse(
            readFileSync(resolve("./src/config/c45-route-74549-firebase-adminsdk-fbsvc-ca07563c99.json")).toString()
        ) as string;

        this.client = admin.apps.length
            ? admin.app()
            : admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });
    }

// Send Single Notification    

    async sendNotification({
        userId,
        token,
        title,
        body,
        entityId,
        entityType,
        senderId,
        type
    }: {
        userId: Types.ObjectId | string;
        token: string;
        title: string;
        body: string;
        entityId: string;
        entityType: string;
        senderId: string;
        type: string;
    }) {
        try {
            return await this.client.messaging().send({
                token,
                notification: {
                    title,
                    body
                },
                data : {
                    entityId,
                    entityType,
                    senderId,
                    type
                }
            });

        } catch (error : any ) {
            if (
                error.code === "messaging/registration-token-not-registered" ||
                error.code === "messaging/invalid-registration-token"
            ) {
                await this.redis.removeFCM(userId, token);
            }

            throw error;
        }
    }

    // ----------------------------------------------------------------------
   
    // Send Multiple Notifications    
    async sendNotifications({
        userId,
        tokens,
        title,
        body,
        entityId,
        entityType,
        senderId,
        type
    }: {
        userId: Types.ObjectId | string;
        tokens: string[];
        title: string;
        body: string;
        entityId: string;
        entityType: string;
        senderId: string;
        type: string;
    }) {
        const response = await Promise.allSettled(
            tokens.map((token: string) =>
                this.sendNotification({
                    userId: userId as Types.ObjectId | string,
                    token,
                    title,
                    body,
                    entityId,
                    entityType,
                    senderId,
                    type
                })
            )
        );

        for (let i = 0; i < response.length; i++) {
            const result = response[i];

            if (result?.status === "rejected") {
                const errorCode = result?.reason?.code;

                if (
                    errorCode === "messaging/registration-token-not-registered" ||
                    errorCode === "messaging/invalid-registration-token"
                ) {
                        await this.redis.removeFCM(userId, tokens[i] as string);
                    }
                }
            }

        return response;
    }

}

export const notificationService = new NotificationService();




// async sendNotification({token , title , body}: {token : string , title : string , body : string}) {
//    return await this.client.messaging().send({
//         token: token,
//         notification: {
//             title: title,
//             body: body
//         }
//     });
// }


 // async sendNotifications({ tokens, title, body }: { tokens: string[], title: string, body: string }) {
    //     await Promise.allSettled(
    //         tokens.map((token: string) => 
    //             this.sendNotification({ token, title, body })
    //         )
    //     );
    //     // Promise.allSettled => ensures that if one notification fails, the others are still sent.
    // }
