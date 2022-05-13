import net from "net";
import Connect, { Callback } from "./connect";
import { Proxy } from "../types";
import SSocket from "../core/ssocket";

/**
 * 直接连接
 */
export default class DirectConnect extends Connect {
   constructor() {
      super({
         protocol: "direct",
      });
   }
   /**
    * 连接远程代理主机
    * @param host 目标主机ip或域名
    * @param port 目标主机端口
    * @param proxy 代理服务器信息
    * @param callback 连接成功后的回调方法
    */
   public async connect(host: string, port: number, proxy: Proxy, callback: Callback): Promise<SSocket> {
      return new Promise((resolve, reject) => {
         let socket = net.connect(port, host, () => {
            let ssocket = new SSocket(socket);
            ssocket.protocol = this.protocol;
            ssocket.on("read", (data) => this.emit("read", data));
            ssocket.on("write", (data) => this.emit("write", data));
            callback(undefined, ssocket);
            resolve(ssocket);
         });
         socket.on("error", (err) => {
            socket.destroy(err);
            callback(err, new SSocket(socket));
         });
      });
   }
}
