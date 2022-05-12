import net from "net";
import Connect, { Callback } from "./connect";
import { Proxy } from "../types";

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
   public async connect(host: string, port: number, proxy: Proxy, callback: Callback): Promise<net.Socket> {
      return new Promise((resolve, reject) => {
         let socket = net.connect(port, host, () => {
            callback(undefined, socket);
            resolve(socket);
         });
         socket.on("error", (err) => {
            socket.destroy(err);
            callback(err, socket);
         });
      });
   }
}
