import net from "net";
//import { EventEmitter } from "events";
//import ping from "ping";
import { Proxy, ConnectOptions } from "../types";
import Stream from "../core/stream";
import transform from "../core/transform";
import { Transform } from "stream";

export type Callback = (error: Error | undefined, socket: net.Socket) => void;

/**
 * 连接远程代理服务器的抽象类
 */
export default abstract class Connect extends Stream {
   /** 协议 */
   public protocol: string;
   /** 代理服务器信息 */
   public proxy: Proxy;
   protected options: ConnectOptions;
   constructor(options: ConnectOptions) {
      super();
      this.setMaxListeners(999);
      this.options = options;
      this.on("error", (err) => console.error(`connect error ${err.stack || err.message}`));
      this.protocol = options.protocol;
   }

   /**
    * 连接远程代理主机
    * @param host 目标主机ip或域名
    * @param port 目标主机端口
    * @param callback 连接成功后的回调方法
    */
   public abstract connect(host: string, port: number, callback: Callback): Promise<net.Socket>;

   public pipe(sourceSocket: net.Socket, targetSocket: net.Socket, chunk: Buffer, inputTransform?: Transform) {
      inputTransform =
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
      targetSocket.write(chunk);
   }
}
