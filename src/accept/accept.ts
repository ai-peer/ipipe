import net from "net";
import ConnectFactor from "../connect";
import Stream from "../core/stream";
import Sessions from "../core/sessions";
import { Transform } from "stream";
import { AcceptOptions, AcceptAuth, ConnectUser } from "../types";
import { Proxy } from "../types";
import SSocket from "../core/ssocket";

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
   }

   public get acceptAuth() {
      return this.options.auth;
   }

   clone2target(target: Accept) {
      target.connectFactor = this.connectFactor;
      target.options = Object.assign({}, this.options, target.options);
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
   protected async connect(host: string, port: number, localSocket: SSocket, chunk: Buffer, user?: ConnectUser, transform?: Transform) {
      try {
         this.connectFactor.pipe(host, port, localSocket, chunk, user, transform).catch((err) => {
            //console.info("[ERROR] connect", err.message);
            localSocket.destroy(err);
         });
      } catch (err) {
         localSocket.destroy(err);
      }
   }
   protected splitPasswodArgs(str: string): { password: string; args: string[] } {
      let ss = str.split("_");
      return {
         password: ss[0] || "",
         args: ss.slice(1) || [],
      };
   }
}
