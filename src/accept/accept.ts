import net from "net";
import ConnectFactor from "../connect";
import Stream from "../core/stream";
import Sessions from "../core/sessions";
import { Transform } from "stream";
import { AcceptOptions } from "../types";

/**
 * 接收应用端接入协议处理基类
 */
export default abstract class Accept extends Stream {
   public sessions: Sessions = Sessions.instance;
   public protocol: string; // "http" | "https" | "socks5" | "direct";
   public connectFactor: ConnectFactor;
   public options: AcceptOptions;
   constructor(options?: AcceptOptions) {
      super();
      this.setMaxListeners(9999);
      this.options = Object.assign({}, options);
      //this.protocol = options.protocol;
   }

   clone2target(target: Accept) {
      target.connectFactor = this.connectFactor;
   }
   /**
    * 注册连接器, 连接目标服务协议
    * @param connectFactor
    */
   public registerConnect(connectFactor: ConnectFactor) {
      this.connectFactor = connectFactor;
   }
   public getSession(socket: net.Socket): string {
      return this.sessions.getSession(socket);
   }
   /**;
    * 是否可以接入， 请求的协议是否可以接入处理
    * @param socket
    * @param chunk
    */
   public abstract isAccept(socket: net.Socket, chunk: Buffer): Promise<boolean>;

   /**
    * 连接处理
    * @param socket
    * @param firstChunk
    */
   public abstract handle(socket: net.Socket, firstChunk: Buffer): Promise<void>;

   /**
    * 连接目标
    * @param host 目标服务主机ip
    * @param port 目标服务主机端口
    * @param localSocket 本地socket连接
    * @param chunk 首次请求的原始数据
    * @param inputTransform 输入流解码
    */
   protected async connect(host: string, port: number, localSocket: net.Socket, chunk: Buffer, inputTransform?: Transform) {
      this.connectFactor.pipe(host, port, localSocket, chunk, inputTransform).catch((err) => {
         console.info("[ERROR] connect", err.message);
         localSocket.destroy(err);
      });
   }
}
