import express, { NextFunction } from 'express';
import { authRouter, blockRouter, bookmarkRouter, followRouter, friendRequestController, notificationRouter, postRouter, realtimeGateway, repostRouter, schema, userRouter } from './modules';
import { authentication, globalErrorHandler } from './middleware';
import { APPLICATION_NAME, ORIGINS, port } from './config/config';
import { connectDB } from './DB/connection.db';
import { redisService, s3Service} from './common/services';
import { pipeline } from 'node:stream';
import { promisify } from "node:util";
import { successResponse } from './common/response';
import { createHandler } from 'graphql-http/lib/use/express';
import { Server as HttpServerType } from 'http'
import cors from 'cors';
import helmet from "helmet";

const s3WriteStream = promisify(pipeline);

const bootstrap = async () => {
    const app:express.Express = express();


    // Helmet Middleware
    app.use(helmet());

    // CORS Middleware
    app.use(cors ({
        origin: ORIGINS,
        credentials: true
    }));

    // Rate Limiting Middleware
    // app.use(globalRateLimiter);

    app.get('/', (req: express.Request, res: express.Response, next: NextFunction) => {
        res.status(200).json({ message: "Landing page" });
        // we don't need to use return statement here because we are sending the response and not doing any further processing in this route handler.
        //  Once we call res.status().json(), the response is sent back to the client and the route handler is effectively done. 
        // res => return 
    });

    // Test Notification API 
    // Add your FCM token in req.body.token and visit /send-notification to test the notification
    // app.post('/send-notification' , async (req: express.Request, res: express.Response, next: NextFunction): Promise<express.Response> => {
    //     await notificationService.sendNotification({
    //         token: req.body.token as string,
    //         title: " ",
    //         body : "Hello World"
    //     })

    //     return successResponse({
    //         res,
    //         message : "Notification sent successfully",
    //         data : {}
    //     })
    // });

    // Middleware to parse JSON bodies
    app.use(express.json());

    // Graphql endpoint
    app.all('/graphql', authentication(), createHandler({ schema: schema, context : (req)=> ({user : req.raw.user , decoded: req.raw.decoded})}) );

    // Application Routing
    app.use("/auth", authRouter);
    app.use("/user", userRouter);
    app.use("/notification", notificationRouter);
    app.use("/post", postRouter);
    app.use("/follow", followRouter);
    app.use("/friend-request", friendRequestController);
    app.use("/block", blockRouter);
    app.use("/repost", repostRouter);
    app.use("/bookmark", bookmarkRouter);
    
    // app.get("/uploads/*path", async (req: express.Request, res: express.Response, next: NextFunction): Promise<any> => {
    //     const {download , filename} = req.query as { download?: string , filename?: string }
    //     const { path } = req.params as { path: string[] }
    //     const key = path.join('/')
    //     const { Body , ContentType} = await s3Service.getAsset({key})
        
    //     // return successResponse({
    //     //     res,
    //     //     message : "Get s3 data",
    //     //     data : {params: req.params , key , response : {Body , ContentType}}
    //     // })

    //     res.setHeader(
    //         "Content-Type",
    //         ContentType as string || "application/octet-stream"
    //     )

    //     res.set("Cross-Origin-Resource-Policy", "cross-origin");

    //     if(download === "true") {
    //         res.setHeader("Content-Disposition", `attachment; filename="${filename || key.split("/").pop()}"`);
    //     }
         


    //     return await s3WriteStream(
    //         Body as NodeJS.ReadableStream,
    //         res
    //     )
    // })

    // Support both /uploads/Social_Media_App/... and /Social_Media_App/...
    app.get(["/uploads/*path", `/${APPLICATION_NAME}/*path`], async (req: express.Request, res: express.Response, next: NextFunction): Promise<any> => {
        try {
            const { download, filename } = req.query as { download?: string, filename?: string };
            const rawPath = req.params.path;

            const subPath = (Array.isArray(rawPath) ? rawPath.join('/') : rawPath) || '';

            // Ensure the full S3 key includes APPLICATION_NAME
            const key = subPath.startsWith(APPLICATION_NAME)
                ? subPath
                : `${APPLICATION_NAME}/${subPath}`;

            const { Body, ContentType } = await s3Service.getAsset({ key });

            res.setHeader("Content-Type", (ContentType as string) || "application/octet-stream");
            res.set("Cross-Origin-Resource-Policy", "cross-origin");

            if (download === "true") {
                res.setHeader("Content-Disposition", `attachment; filename="${filename || key.split("/").pop()}"`);
            }

            return await s3WriteStream(Body as NodeJS.ReadableStream, res);
        } catch (err) {
            return next(err);
        }
    });

    

    app.get("/pre-signed/*path", async (req: express.Request, res: express.Response, next: express.NextFunction) => {
        const { download, fileName } = req.query as { download: string, fileName: string }
        const { path } = req.params as { path: string[] }
        const Key = path.join("/")
        const url = await s3Service.createPreSignedFetchLink({ Key, download, fileName })
        return successResponse({ res, data: { url } })
    })


    app.get("/*dummy", (req: express.Request, res: express.Response, next: NextFunction) => {
        res.status(404).json({ message: "Invalid application routing" });
    });


    // Global Error Handling Middleware
    app.use(globalErrorHandler);

    // Connect DB
    await connectDB();
    await redisService.connent()
    // await connectRedis()

    const httpServer:HttpServerType = app.listen(port, () => {
        console.log("Server is running on port 3000 🚀");
    });

    await realtimeGateway.initializeIO(httpServer);
    

    console.log("Application bootstrapped successfully!");
}

export default bootstrap;





