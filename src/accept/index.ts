import Accept from "./accept";
import net, { SocketAddress } from "net";
import ConnectFactor from "../connect";
import Socks5Accept from "./socks5.accept";
import HttpAccept from "./http.accept";
import { CreateCallback, AcceptOptions } from "../types";
import EventEmitter from "events";
//import { Options } from "../types";
import logger from "../core/logger";
/**
 * 本地代理接收协议包装类， 用于接入本地的连接接入
 */
export default class AcceptFactor extends EventEmitter {
   /** 接入协议类列表 */
   private accepts: Map<string, Accept> = new Map();
   /** 连接远程代理的连接封装类 */
   protected connectFactor: ConnectFactor;
   constructor(options?: AcceptOptions) {
      super();
      this.setMaxListeners(99);

      let httpAccept = new HttpAccept(options); //http接入
      let socks5Accept = new Socks5Accept(options); //socks5接入

      if (options?.isAccept != false) this.register(socks5Accept).register(httpAccept);
   }

   /**
    * 注册本地代理的可接入协议类
    * @param accept
    */
   public register(accept: Accept) {
      if (this.accepts.has(accept.protocol)) {
         let exist = this.accepts.get(accept.protocol);
         exist?.removeAllListeners("read");
         exist?.removeAllListeners("write");
         exist?.clone2target(accept);
      }

      accept.registerConnect(this.connectFactor);
      accept.on("read", ({ size, socket }) => {
         let session = accept.getSession(socket);
         session && this.emit("read", { size, session, clientIp: socket.remoteAddress });
      });
      accept.on("write", ({ size, socket }) => {
         let session = accept.getSession(socket);
         session && this.emit("write", { size, session, clientIp: socket.remoteAddress });
      });

      this.accepts.set(accept.protocol, accept);
      return this;
   }

   /**
    * 注册连接远程代理的协议封装类
    * @param connectFactor
    */
   public registerConnect(connectFactor: ConnectFactor) {
      this.connectFactor = connectFactor;
      this.accepts.forEach((accept) => {
         accept.registerConnect(connectFactor);
      });

      return this;
   }
   /**
    * 创建本地代理服务
    * @param port
    * @param host
    */
   createServer(port: number, host: string = "0.0.0.0", callback?: CreateCallback): Promise<net.Server> {
      return new Promise((resolve, reject) => {
         let server = net.createServer((socket: net.Socket) => {
            socket.on("error", (err) => {});
            this.accept(socket);
         });
         server.on("error", (err) => {
            console.error("server error ", err.message);
            reject(err);
         });
         server.listen(port, host, () => {
            console.info(`create accept proxy server listen ${port}`, server.address());
            callback && callback(server);
            resolve(server);
         });
      });
   }
   /**
    * 接入处理本地的连接接入
    * @param socket
    */
   public async accept(socket: net.Socket) {
      let chunk: Buffer = await this.read(socket);
      let isAccept = false;
      let accepts = this.accepts.values();

      for (let accept of accepts) {
         isAccept = await accept.isAccept(socket, chunk);
         if (isAccept) {
            console.info(`===>accept client ${socket.remoteAddress} ${accept.protocol}`);
            try {
               accept.handle(socket, chunk).catch((err) => {
                  logger.info("===>accept handle error", err.message);
                  socket.destroy();
               });
            } catch (err) {
               logger.info("===>accept handle error", err.message);
               socket.destroy();
            }

            break;
         }
      }

      if (isAccept == false) {
         logger.warn("===>no support protocol to hanle");
         socket.destroy(new Error("no support protocol to hanle"));
      }
   }
   private read(socket: net.Socket, ttl: number = 0): Promise<Buffer> {
      return new Promise((resolve) => {
         let isRead = false;
         socket.once("data", (ss) => {
            if (isRead) return;
            isRead = true;
            resolve(ss);
         });
         ttl > 0 &&
            setTimeout(() => {
               if (isRead) return;
               isRead = true;
               resolve(Buffer.alloc(0));
            }, ttl);
      });
   }
}
