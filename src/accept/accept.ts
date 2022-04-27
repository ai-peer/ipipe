import net from "net";
import ConnectFactor from "../connect";
import Stream from "../core/stream";

/**
 * 接收应用端接入协议处理基类
 */
export default abstract class Accept extends Stream {
   public protocol: string; // "http" | "https" | "socks5" | "direct";
   protected connectFactor: ConnectFactor;
   constructor() {
      super();
      this.setMaxListeners(9999);
      //this.protocol = options.protocol;
   }
   /**
    * 注册连接器, 连接目标服务协议
    * @param connectFactor
    */
   public registerConnect(connectFactor: ConnectFactor) {
      this.connectFactor = connectFactor;
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
   public abstract handle(socket: net.Socket, firstChunk: Buffer);

   /**
    * 连接目标
    * @param host 目标服务主机ip
    * @param port 目标服务主机端口
    * @param localSocket 本地socket连接
    * @param chunk 首次请求的原始数据
    */
   protected async connect(host: string, port: number, localSocket: net.Socket, chunk: Buffer) {
      this.connectFactor.pipe(host, port, localSocket, chunk);
   }
}
