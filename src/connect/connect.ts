import net from "net";
//import { EventEmitter } from "events";
//import ping from "ping";
import { Proxy, ConnectOptions, ProxyMode } from "../types";
import Stream from "../core/stream";
import transform from "../core/transform";
import { Transform } from "stream";
import SSocket from "../core/ssocket";
import { buildSN } from "../core/password";

export type Callback = (error: Error | Buffer | undefined, socket: SSocket) => void;

/**
 * 连接远程代理服务器的抽象类
 */
export default abstract class Connect extends Stream {
   /** 协议 */
   //public protocol: string;
   protected options: ConnectOptions;
   protected timeout: number = 3 * 1000;
   constructor(options: ConnectOptions) {
      super();
      //this.setMaxListeners(99);
      this.options = options;
      this.on("error", (err) => {});
      this.protocol = options.protocol;
   }

   public setTimeout(ttl: number = 3 * 1000) {
      this.timeout = ttl;
      //handle && this.on("timeout", handle);
   }
   /**
    * 生成基于http协议代理的用户认证密钥信息
    * @param proxy
    */
   buildHttpProxyAuthorization(proxy: { mode: ProxyMode; username: string; password: string }) {
      let pwd = proxy.password || "";
      pwd = proxy.mode == 1 ? pwd + "_" + proxy.mode + "_" + buildSN(6) : pwd + "_" + proxy.mode;
      let up = proxy.username + ":" + pwd;
      return up;
   }
   /**
    * 连接远程代理主机
    * @param host 目标主机ip或域名
    * @param port 目标主机端口
    * @param proxy 代理服务器信息
    * @param callback 连接成功后的回调方法
    */
   public abstract connect(host: string, port: number, proxy: Proxy, callback: Callback): Promise<SSocket>;

   public pipe(sourceSocket: SSocket, targetSocket: SSocket, chunk: Buffer) {
      sourceSocket.pipe(targetSocket).pipe(sourceSocket);
      targetSocket.write(chunk);
      /*  inputTransform =
         inputTransform ||
         transform((chunk, encoding, callback) => {
            callback(null, chunk);
         });
      sourceSocket
         .pipe(inputTransform)
         .pipe(
            transform((chunk, encoding, callback) => {
               this.emit("read", { size: chunk.length, socket: sourceSocket });
               callback(null, chunk);
            }),
         )
         .pipe(targetSocket)
         .pipe(
            transform((chunk: Buffer, encoding, callback) => {
               this.emit("write", { size: chunk.length, socket: sourceSocket });
               callback(null, chunk);
            }),
         )
         .pipe(sourceSocket);
      targetSocket.write(chunk); */
   }
}
