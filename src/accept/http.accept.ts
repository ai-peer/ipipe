import Accept from "./accept";
import net from "net";
import { AcceptOptions } from "./accept";

/**
 * Http协议接入类
 */
export default class HttpAccept extends Accept {
   constructor(options?: AcceptOptions) {
      super(options);
      this.protocol = "http";
   }

   public async isAccept(socket: net.Socket, chunk: Buffer): Promise<boolean> {
      let str = chunk.toString();
      return this.isHttpProtocol(str);
   }
   public async handle(socket: net.Socket, firstChunk: Buffer) {
      /** 解析首次http请求协议获取反馈和主机信息 start */
      let str = firstChunk.toString();
      let headers = parseHeader(str);
      let hp = headers["host"]?.split(":");
      let host = hp[0],
         port = parseInt(hp[1]) || 80;
      if (!host) return false;
      let isAuth = !!headers["proxy-authorization"];
      if (isAuth) {
         let user = this.getUser(headers["proxy-authorization"]);
         let authRes = this.options.auth?.username == user.username && this.options.auth?.password == user.password;
         if (!authRes) {
            return this.end(socket, Buffer.from(["HTTP/1.1 407", "Proxy-Authorization: ", "\r\n"].join("\r\n")));
         }
         this.sessions.add(socket, user.username);
      } else {
         this.sessions.add(socket);
      }
      this.emit("read", { socket: socket, size: firstChunk.length });
      if (/^CONNECT/i.test(str)) {
         port = parseInt(hp[1]) || 443;
         //https请示
         await this.write(socket, Buffer.from(`HTTP/1.1 200 Connection Established\r\n\r\n`));
         firstChunk = await this.read(socket, 500);
      }
      /** 解析首次http请求协议获取反馈和主机信息 end */

      this.connect(host, port, socket, firstChunk);
   }
   private getUser(authorization: string) {
      let kv = authorization.split(" ")[1];
      let buf = Buffer.from(kv, "base64");
      let kvs = buf.toString().split(":");
      let username = kvs[0],
         password = kvs[1];
      return {
         username,
         password,
      };
   }

   private isHttpProtocol(str: string) {
      switch (str[0].toUpperCase()) {
         case "G": //GET
         case "H": //HEAD
         case "P": //POST,PUT
         case "D": //DELETE
         case "O": //OPTIONS
         case "T": //TRACE
         case "C": //CONNECT
            return true;
      }
      return false;
   }
}
function parseHeader(str: string) {
   let lines = str.split("\r\n");
   let headers = {};
   lines.forEach((v) => {
      let ks = v.split(": ");
      if (ks.length < 2) return;
      let key = ks[0] || "",
         value = ks[1] || "";
      headers[key.trim().toLowerCase()] = value.trim();
   });
   return headers;
}
