import { Server as HttpServerType} from "node:http";
import { Server } from "socket.io";
import { IAuthSocket } from "../../common/types/express.types";
import { redisService, RedisService, TokenService } from "../../common/services";
import { chatGateway } from "../chat/realtime";
import { ORIGINS } from "../../config/config";



export class RealtimeGatway{
    private io!:Server;  // assessment asertion operator (make sure)
    private tokenService:TokenService;
    private redisService:RedisService 

    constructor(){
        this.redisService = redisService;
        this.tokenService = new TokenService();
    }
    

    authentication = (async (socket: IAuthSocket, next: any) => {
        try {
            const token = socket.handshake.auth?.token ||
                          socket.handshake.auth?.authorization ||
                          socket.handshake.headers?.authorization;

            const { user, decoded } = await this.tokenService.decodeToken(token);
            socket.data = { user, decoded };
            await this.redisService.addSocket(user._id, socket.id);
            next();
        } catch (error) {
            console.log(error);
            next(error);
        }
    })


    initializeIO = (httpServer : HttpServerType) => {
        this.io = new Server(httpServer , {
            cors: { origin: ORIGINS }
        })
        
            this.io.of("/").use(this.authentication)
        
            this.io.on("connection" , async (socket:IAuthSocket) => {
                console.log(`User Connected 👌`)
                chatGateway.registerEvents(socket, this.io);
                const connections = await this.redisService.getSockets(socket.data.user._id.toString())
                console.log(`Connections are : ${connections.length}`)
        
                socket.on("disconnect", async () => {
                    console.log(`User Disconnected 😥`)
                    await this.redisService.removeSocket(socket.data.user._id.toString(), socket.id);
                    
                    const connections = await this.redisService.getSockets(socket.data.user._id.toString())
                    console.log(`Connections are : ${connections.length}`)
                    if (connections.length < 1) {
                        this.io.emit("user_offline", { user: socket.data.user._id })
                    }
                })
            })
        
        
    }

    getIo() :Server{
        return this.io;
    } 
}

export const realtimeGateway = new RealtimeGatway()