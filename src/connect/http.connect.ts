import net from "net";
import Connect, { Callback } from "./connect";
import assert from "assert";
import { Proxy } from "..//types";
import SSocket from "../core/ssocket";

/**
 * http代理连接
 */
export default class HttpConnect extends Connect {
   constructor() {
      super({
         protocol: "http",
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
         let socket = net.connect(proxy.port, proxy.host, async () => {
            let ssocket = new SSocket(socket);
            ssocket.protocol = this.protocol;
            ssocket.on("read", (data) => this.emit("read", data));
            ssocket.on("write", (data) => this.emit("write", data));
            let usePassword = !!proxy.username && !!proxy.password;
            let up = (proxy.username || "").trim() + ":" + (proxy.password || "").trim();
            up = Buffer.from(up).toString("base64");
            let sendChunk = Buffer.concat([
               Buffer.from(`CONNECT ${host}:${port} HTTP/1.1\r\n`), //
               Buffer.from(`Host: ${host}:${port}\r\n`), //
               Buffer.from(`Proxy-Connection: keep-alive\r\n`), //
               //Buffer.from(`User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.2612.71 Safari/537.36\r\n`), //
               Buffer.from(usePassword ? `Proxy-Authorization: Basic ${up}\r\n` : ""),
               Buffer.from("\r\n"),
            ]);
            //await this.write(socket, sendChunk);
            await ssocket.write(sendChunk);
            //let receiveChunk = await this.read(socket, 500);
            let receiveChunk = await ssocket.read(5 * 1000);
            let statusCode = receiveChunk.toString().split(" ")[1];
            if (usePassword) {
               let checked = statusCode != "407";
               this.emit("auth", { checked: checked, socket: socket, username: proxy.username, password: proxy.password, args: (proxy.password || "").split("_").slice(1) });
               if (!checked) {
                  callback(receiveChunk, ssocket);
                  resolve(ssocket);
                  return;
               }
            } else {
               let checked = statusCode == "200";
               if (!checked) {
                  callback(receiveChunk, ssocket);
                  resolve(ssocket);
                  return;
               }
            }
            callback(undefined, ssocket);
            resolve(ssocket);
         });
         socket.setTimeout(this.timeout);
         socket.on("timeout", ()=>this.emit("timeout"));
         socket.on("error", (err) => {
            socket.destroy(err);
            this.emit("error", err);
            callback(err, new SSocket(socket));
         });
      });
   }
}
