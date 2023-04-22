import Accept from "./accept";
import net, { SocketAddress } from "net";
import ConnectFactor from "../connect";
import Socks5Accept from "./socks5.accept";
import HttpAccept from "./http.accept";
import LightAccept from "./light.accept";
import WrtcAccept from "./wrtc.accept";
import { CreateCallback, AcceptOptions, AcceptAuthData, AcceptData, Proxy } from "../types";
import EventEmitter from "eventemitter3";
import { StreamEvent } from "../core/stream";
//import { Options } from "../types";
import logger from "../core/logger";

export type EventName = StreamEvent & {
   accept: (data: AcceptData) => void;

   /**
    * 接入风险警告
    */
   risk: (data: { ip: string; port: number; message: string }) => void;
};

/**
 * 本地代理接收协议包装类， 用于接入本地的连接接入
 */
export default class AcceptFactor extends EventEmitter<EventName> {
   static HttpAccept = HttpAccept;
   static Socks5Accept = Socks5Accept;
   static LightAccept = LightAccept;
   static WrtcAccept = WrtcAccept;
   static Accept = Accept;
   /** 接入协议类列表 */
   public accepts: Map<string, Accept> = new Map();
   /** 连接远程代理的连接封装类 */
   protected connectFactor: ConnectFactor;
   public server: net.Server;
   public options: AcceptOptions;
   //public timeout: number = 0;
   constructor(options?: AcceptOptions) {
      super();
      options = Object.assign({}, options);
      this.options = options;
      let httpAccept = new HttpAccept(options); //http接入
      let socks5Accept = new Socks5Accept(options); //socks5接入

      /*       if (options.peerId) {
         //启用peer节点接入技术
         this.xpeer = new XPeer({ id: options.peerId, username: options.username, password: options.password });
         let wrtcAccept = new WrtcAccept(options);
         this.register(wrtcAccept);
      }
 */
      if (options?.isAccept != false) this.register(socks5Accept).register(httpAccept);
   }
   public close() {
      this.server?.close();
   }
/*    setTimeout(timeout: number = 0) {
      this.timeout = timeout;
   } */
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
      accept.on("read", (data) => {
         //let session = accept.getSession(socket);
         this.emit("read", data);
      });
      accept.on("write", (data) => {
         //let session = accept.getSession(socket);
         //console.info(">>>write", Math.ceil((1000 * size) / 1024) / 1000+"KB", session);
         this.emit("write", data);
      });
      accept.on("auth", (data) => {
         //let session = accept.getSession(data["socket"]);
         //session && this.emit("auth", { ...data, session, clientIp: data.socket.remoteAddress });
         this.emit("auth", data);
      });
      accept.on("error", (err) => {
         console.info("accept error", err);
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
      //connectFactor.on("open", () => this.emit("open"));
      connectFactor.on("request", () => this.emit("open"));
      return this;
   }
   /**
    * 注册已经创建的本地服务， 注册这个就可以不用另行创建本地代理服务
    * @param server
    */
   registerServer(server: net.Server) {
      server.on("connection", (socket: net.Socket) => {
         socket.once("error", (err) => {
            socket.destroy();
         });
         this.accept(socket);
      });
      server.on("error", (err) => {
         logger.warn("server error ", err.message);
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
         this.server = server;
         server.on("error", (err) => {
            logger.warn("server error ", err.message);
            reject(err);
         });
         server.listen(port, host, () => {
            logger.info(`create accept proxy server listen`, server.address());
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
      let chunk: Buffer = await this.read(socket, 5 * 1000);
      let isAccept = false;
/*       if (this.timeout > 0) {
         //检测超时
         //socket.on("timeout", () => socket.end());
         //socket.setTimeout(this.timeout);
      } */
      let accepts = this.accepts.values();
      const byteLength = chunk.byteLength;
      if (byteLength < 1) {
         socket.destroy();
         return;
      }
      for (let accept of accepts) {
         isAccept = await accept.isAccept(socket, chunk);
         if (isAccept) {
            //console.info(`===>accept client ${accept.protocol} ${chunk.toString()}`);
            try {
               this.emit("accept", { socket, protocol: accept.protocol });
               //let clientIp = socket.remoteAddress || "";
               //let protocol = accept.protocol;

               this.on("open", () => {
                  //console.info("open================", protocol, socket.localPort, socket.remotePort);
               });
               socket.once("close", () => {
                  this.emit("close", socket);
               });
               accept.handle(socket, chunk).catch((err) => {
                  logger.warn(`accept[${accept.protocol}] handle error`, err);
                  socket.destroy();
                  this.emit("error", err);
               });
            } catch (err) {
               logger.warn(`accept[${accept.protocol}] handle error`, err);
               socket.destroy(err);
               this.emit("error", err);
            } finally {
               break;
            }
         }
      }

      if (isAccept == false) {
         logger.debug("===>no support protocol to hanle");
         this.emit("accept", { socket, protocol: "no" });
         this.emit("risk", { ip: socket.remoteAddress || "", port: socket.remotePort || 0, message: "no support protocol" }); //触发来源警告风险
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
