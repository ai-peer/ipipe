//import { EventEmitter } from "events";
//import ping from "ping";
import { Proxy, ConnectOptions, ProxyMode } from "../types";
import Stream from "../core/stream";
import transform from "../core/transform";
import SSocket from "../core/ssocket";

export type Callback = (error: Error | Buffer | undefined, socket: SSocket, data: { host: string; port: number }) => void;

/**
 * 连接远程代理服务器的抽象类
 */
export default abstract class Connect extends Stream {
   protected options: ConnectOptions;
   protected timeout: number = 15 * 1000;
   constructor(options: ConnectOptions) {
      super();
      //this.setMaxListeners(99);
      this.options = Object.assign({ protocol: "socks5" }, options);
      this.on("error", (err) => {});
      this.protocol = options.protocol || "socks5";
   }

   public setTimeout(ttl: number = 3 * 1000) {
      this.timeout = ttl;
      //handle && this.on("timeout", handle);
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
      if (targetSocket.protocol == "wrtc") {
         setTimeout(() => targetSocket.write(chunk), 50);
      } else {
         targetSocket.write(chunk);
      }

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
