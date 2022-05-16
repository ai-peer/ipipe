import Accept from "./accept";
import net, { SocketAddress } from "net";
import ConnectFactor from "../connect";
import Socks5Accept from "./socks5.accept";
import HttpAccept from "./http.accept";
import LightAccept from "./light.accept";

import { CreateCallback, AcceptOptions, AcceptAuth } from "../types";
import EventEmitter from "events";
//import { Options } from "../types";
import logger from "../core/logger";
import { Proxy } from "../types";
import { Transform } from "stream";
/**
 * 本地代理接收协议包装类， 用于接入本地的连接接入
 */
export default class AcceptFactor extends EventEmitter {
   static HttpAccept = HttpAccept;
   static Socks5Accept = Socks5Accept;
   static LightAccept = LightAccept;
   static Accept = Accept;
   /** 接入协议类列表 */
   private accepts: Map<string, Accept> = new Map();
   /** 连接远程代理的连接封装类 */
   protected connectFactor: ConnectFactor;
   private server: net.Server;
   private options: AcceptOptions;

   constructor(options?: AcceptOptions) {
      super();
      this.setMaxListeners(99);
      options = options || {};
      this.options = options;
      let httpAccept = new HttpAccept(options); //http接入
      let socks5Accept = new Socks5Accept(options); //socks5接入

      if (options?.isAccept != false) this.register(socks5Accept).register(httpAccept);
   }
   public close() {
      this.server?.close();
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
      } else {
         accept.options = Object.assign({}, this.options, accept.options);
      }

      accept.registerConnect(this.connectFactor);
      accept.on("read", ({ size, socket, protocol }) => {
         let session = accept.getSession(socket);
         session && this.emit("read", { size, session, clientIp: socket.remoteAddress, protocol });
      });
      accept.on("write", ({ size, socket, protocol }) => {
         let session = accept.getSession(socket);
         session && this.emit("write", { size, session, clientIp: socket.remoteAddress, protocol });
      });
      accept.on("auth", (data) => {
         let session = accept.getSession(data.socket);
         session && this.emit("auth", { ...data, session, clientIp: data.socket.remoteAddress });
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
    * 注册已经创建的本地服务， 注册这个就可以不用另行创建本地代理服务
    * @param server
    */
   registerServer(server: net.Server) {
      server.on("connection", (socket: net.Socket) => {
         socket.on("error", (err) => {
            socket.destroy(err);
         });
         this.accept(socket);
      });
      server.on("error", (err) => {
         //logger.warn("server error ", err.message);
      });
   }
   /**
    * 创建本地代理服务
    * @param port
    * @param host
    */
   createServer(port: number, host: string = "0.0.0.0", callback?: CreateCallback): Promise<net.Server> {
      return new Promise((resolve, reject) => {
         if (this.server) {
            resolve(this.server);
            return;
         }
         let server = net.createServer((socket: net.Socket) => {
            socket.on("error", (err) => {
               socket.destroy(err);
            });
            this.accept(socket);
         });
         server.on("error", (err) => {
            logger.warn("server error ", err.message);
            reject(err);
         });
         server.listen(port, host, () => {
            logger.debug(`create accept proxy server listen ${port}`, server.address());
            callback && callback(server);
            resolve(server);
         });
         this.server = server;
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
      const byteLength = chunk.byteLength;
      //console.info("s apt ", chunk.toString())
      for (let accept of accepts) {
         isAccept = await accept.isAccept(socket, chunk);
         if (isAccept) {
            //console.info(`===>accept client ${socket.remoteAddress}:${socket.remotePort} ${accept.protocol}`);
            try {
               this.emit("accept", socket, { protocol: accept.protocol });
               let clientIp = socket.remoteAddress;
               let protocol = accept.protocol;
               socket.on("close", () => {
                  let session = accept.getSession(socket);
                  session && this.emit("read", { size: byteLength, session, clientIp: clientIp, protocol: protocol });
                  this.emit("close", socket);
               });
               accept.handle(socket, chunk).catch((err) => {
                  //logger.info("===>accept handle error", err.message);
                  socket.destroy();
                  this.emit("error", err);
               });
            } catch (err) {
               //logger.info("===>accept handle error", err.message);
               socket.destroy(err);
               this.emit("error", err);
            } finally {
               break;
            }
         }
      }

      if (isAccept == false) {
         logger.debug("===>no support protocol to hanle");
         this.emit("accept", socket, { protocol: "no" });
         this.emit("risk", { ip: socket.remoteAddress || "", port: socket.remotePort, message: "no support protocol" }); //触发来源警告风险
         let html = this.notiryNoSupportAccept();
         socket.write(html, "utf-8");
         socket.end();
      }
   }
   private notiryNoSupportAccept() {
      let htmls: string[] = [];
      let headers = ["HTTP/1.0 200 OK", "Content-Type: text/html;charset=utf8", "\r\n"];
      htmls.push(headers.join("\r\n"));
      htmls.push(`<html><header><style> body{text-align: center;}</style></header><body>
         <p>private site, please contact the administrator!</p>
         </body></html>`);
      return htmls.join("");
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
