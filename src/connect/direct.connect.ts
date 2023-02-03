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
      //console.info("connect direct", host+":"+port);
      return new Promise((resolve, reject) => {
         let isTimeout = true,
            pid;
         let socket = net.connect(port, host, () => {
            try {
               isTimeout = false;
               pid && clearTimeout(pid);
               let ssocket = new SSocket(socket);
               ssocket.protocol = this.protocol;
               ssocket.type = "connect";
               ssocket.on("read", (data) => this.emit("read", data));
               ssocket.on("write", (data) => this.emit("write", data));
               callback(undefined, ssocket, { host, port });
               resolve(ssocket);
            } catch (err) {
               socket.emit("error", err);
            }
         });
         if (this.timeout > 0) pid = setTimeout(() => isTimeout && socket.emit("timeout"), this.timeout);
         socket.once("timeout", () => {
            let error = new Error(`HTTP/1.1 500 timeout[${this.timeout}-direct]`);
            socket.emit("error", error);
            this.emit("timeout");
            //callback(error, new SSocket(socket));
         });
         socket.once("error", (err) => {
            socket.destroy();
            this.emit("error", err);
            callback(err, new SSocket(socket), { host, port });
            resolve(new SSocket(socket));
         });
      });
   }
}
