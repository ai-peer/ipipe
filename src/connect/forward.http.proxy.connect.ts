import net from "net";
import Connect, { Callback } from "./connect";

/**
 * 透过中转服务转发连接http代理连接
 */
export default class ForwardHttpProxyConnect extends Connect {
   constructor() {
      super({
         protocol: "forward.http",
      });
   }

   public async connect(host: string, port: number, callback: Callback): Promise<net.Socket> {
      return new Promise((resolve, reject) => {
         let proxy = this.proxy;

         let socket = net.connect(proxy.forwardPort || 0, proxy.forwardHost, async () => {
            let usePassword = !!proxy.username && !!proxy.password;
            let up = proxy.username + ":" + proxy.password;
            up = Buffer.from(up).toString("base64");

            /**  第一步连接中转服务器 */
            let sendChunk = Buffer.concat([
               Buffer.from(`CONNECT ${proxy.host}:${proxy.port} HTTP/1.1\r\n`), //
               Buffer.from(`Host: ${proxy.host}:${proxy.port}\r\n`), //
               Buffer.from(`Proxy-Connection: keep-alive\r\n`), //
               //Buffer.from(`User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.2612.71 Safari/537.36\r\n`), //
               //Buffer.from(usePassword ? `Proxy-Authorization: Basic ${up}\r\n` : ""),
               Buffer.from("\r\n"),
            ]);
            //console.info(`s1 send`, sendChunk.toString(), host, port);
            await this.write(socket, sendChunk);
            let receiveChunk = await this.read(socket);
            //console.info(`s1 read`, receiveChunk, receiveChunk.toString());
            let statusCode = receiveChunk.toString().split(" ")[1];
            if (statusCode != "200") {
               socket.destroy(new Error(receiveChunk.toString()));
               callback(undefined, socket);
               resolve(socket);
               return;
            }

            /** 第二步 通过中转服务器连接到目标服务器 */
            sendChunk = Buffer.concat([
               Buffer.from(`CONNECT ${host}:${port} HTTP/1.1\r\n`), //
               Buffer.from(`Host: ${host}:${port}\r\n`), //
               Buffer.from(`Proxy-Connection: keep-alive\r\n`), //
               //Buffer.from(`User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.2612.71 Safari/537.36\r\n`), //
               Buffer.from(usePassword ? `Proxy-Authorization: Basic ${up}\r\n` : ""),
               Buffer.from("\r\n"),
            ]);
            // console.info(`s2 send`, sendChunk.toString(), host, port);
            await this.write(socket, sendChunk);
            receiveChunk = await this.read(socket);
            // console.info(`s2 read`, receiveChunk, receiveChunk.toString());

            statusCode = receiveChunk.toString().split(" ")[1];
            if (statusCode != "200") {
               socket.destroy(new Error(receiveChunk.toString()));
            }

            callback(undefined, socket);
            resolve(socket);
         });
         socket.on("error", (err) => {
            callback(err, socket);
            socket.destroy(err);
         });
      });
   }
}
