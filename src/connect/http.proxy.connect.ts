import net from "net";
import Connect, { Callback } from "./connect";

/**
 * http代理连接
 */
export default class HttpProxyConnect extends Connect {
   constructor() {
      super({
         protocol: "http",
      });
   }

   public async connect(host: string, port: number, callback: Callback): Promise<net.Socket> {
      return new Promise((resolve, reject) => {
         let proxy = this.proxy;
         let socket = net.connect(proxy.port, proxy.host, async () => {
            let usePassword = !!proxy.username && !!proxy.password;
            let up = proxy.username + ":" + proxy.password;
            up = Buffer.from(up).toString("base64");
            let sendChunk = Buffer.concat([
               Buffer.from(`CONNECT ${host}:${port} HTTP/1.1\r\n`), //
               Buffer.from(`Host: ${host}:${port}\r\n`), //
               Buffer.from(`Proxy-Connection: keep-alive\r\n`), //
               //Buffer.from(`User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.2612.71 Safari/537.36\r\n`), //
               Buffer.from(usePassword ? `Proxy-Authorization: Basic ${up}\r\n` : ""),
               Buffer.from("\r\n"),
            ]);
            await this.write(socket, sendChunk);
            let receiveChunk = await this.read(socket);
            let statusCode = receiveChunk.toString().split(" ")[1];
            callback(undefined, socket);
            resolve(socket);
            if (statusCode != "200") socket.destroy(new Error(receiveChunk.toString()));
         });
         socket.setTimeout(15000);
         socket.on("error", (err) => {
            socket.destroy(err);
            callback(err, socket);
         });
      });
   }
}
