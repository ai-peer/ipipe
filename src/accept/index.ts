import Accept from "./accept";
import net from "net";
import ConnectFactor from "../connect";
import Socks5Accept from "./socks5.accept";
import HttpAccept from "./http.accept";
import { CreateCallback } from "../types";
import { AcceptOptions } from "./accept";

/**
 * 本地代理接收协议包装类， 用于接入本地的连接接入
 */
export default class AcceptFactor {
   /** 接入协议类列表 */
   protected acceptList: Accept[] = [];
   /** 连接远程代理的连接封装类 */
   protected connectFactor: ConnectFactor;
   constructor(options?: AcceptOptions) {
      let httpAccept = new HttpAccept(options); //http接入
      let socks5Accept = new Socks5Accept(options); //socks5接入
      this.register(httpAccept).register(socks5Accept);
   }
   /**
    * 注册本地代理的可接入协议类
    * @param accept
    */
   public register(accept: Accept) {
      let index = this.acceptList.findIndex((v) => v.protocol == accept.protocol);
      if (index >= 0) {
         let oldAccept = this.acceptList[index];
         oldAccept.clone2target(accept);
         this.acceptList[index] = accept;
      } else {
         this.acceptList.push(accept);
      }
      return this;
   }
   /**
    * 注册连接远程代理的协议封装类
    * @param connectFactor
    */
   public registerConnect(connectFactor: ConnectFactor) {
      this.connectFactor = connectFactor;
      this.acceptList.forEach((accept: Accept) => {
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
      for (let i = 0; i < this.acceptList.length; i++) {
         let accept = this.acceptList[i];
         let isAccept = await accept.isAccept(socket, chunk);
         if (isAccept) {
            accept.handle(socket, chunk);
            break;
         }
      }
   }
   private read(socket: net.Socket, ttl: number = 0): Promise<Buffer> {
      return new Promise((resolve) => {
         /*       socket.once("readable", () => {
      let ss = socket.read();
      resolve(ss);
      ss?.length > 0 && callback && callback(ss.length);
    }); */
         //let pid = setTimeout(() => resolve(Buffer.from([])), 40);
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
