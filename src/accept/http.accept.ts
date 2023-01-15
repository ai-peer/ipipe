import Accept from "./accept";
import net, { SocketAddress } from "net";
import { AcceptOptions, ConnectUser } from "../types";
import logger from "../core/logger";
import SSocket from "../core/ssocket";

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
      let ssocket = new SSocket(socket);
      ssocket.protocol = this.protocol;
      ssocket.on("read", (data) => {
         //console.info("====read", Math.ceil(1000 * data.size/1024)/1000);
         this.emit("read", data);
      });
      ssocket.on("write", (data) => {
         //console.info("====write",socket.remotePort, data.socket.remoteAddress+":"+data.socket.remotePort, Math.ceil(1000 * data.size/1024)/1000);
         this.emit("write", data);
      });
      /** 解析首次http请求协议获取反馈和主机信息 start */
      let str = firstChunk.toString();
      let headers = parseHeader(str);
      let hp = headers["host"]?.split(":");
      let host = hp[0],
         port = parseInt(hp[1]) || 80;
      if (!host) return;
      let user: ConnectUser | undefined = this.parseHttpUser(headers["proxy-authorization"]);
      let isAuth = !!this.acceptAuth;

      // 需要鉴权
      if (isAuth) {
         this.sessions.add(socket, user.username);
         const session = this.getSession(socket);
         const clientIp = socket.remoteAddress || "";
         //let authRes = this.options.auth?.username == user.username && this.options.auth?.password == user.password;
         let authRes = this.acceptAuth
            ? await this.acceptAuth({
                 username: user.username,
                 password: user.password,
                 args: user.args, //
                 //socket: socket,
                 protocol: this.protocol,
                 session,
                 clientIp,
              })
            : true;

         //console.info("accept s3",authRes, this.getSession(socket), user);
         this.emit("auth", {
            checked: authRes,
            type: "accept",
            session, //
            username: user.username,
            password: user.password,
            args: user.args,
            clientIp,
         });
         //console.info("accept s4",authRes);

         if (!authRes) {
            //this.end(socket, Buffer.from(["HTTP/1.0 407 autherror", "Proxy-Authorization: ", "\r\n"].join("\r\n")));
            await ssocket.end(Buffer.from(["HTTP/1.0 407 autherror", "Proxy-Authorization: ", "\r\n"].join("\r\n")));
            logger.debug(`===>auth error http username=${user.username} password=${user.password}`);
            return;
         }
         //user =
      } else {
         this.sessions.add(socket, user?.username);
      }
      //console.info("req headers", str);
      if (/^CONNECT/i.test(str)) {
         port = parseInt(hp[1]) || 443;
         //https请示
         // await this.write(socket, Buffer.from(`HTTP/1.1 200 Connection Established\r\n\r\n`));
         await ssocket.write(Buffer.from(`HTTP/1.1 200 Connection Established\r\n\r\n`));
         //firstChunk = await this.read(socket, 500);
         firstChunk = await ssocket.read(500);
      }
      /** 解析首次http请求协议获取反馈和主机信息 end */
      this.connect(host, port, ssocket, firstChunk, user);
   }
   /* private getUser(authorization: string): ConnectUser {
      try {
         authorization = authorization || "";
         let kv = authorization.trim().split(" ")[1] || "";
         let buf = Buffer.from(kv, "base64");
         let kvs = buf.toString().split(":");
         let username = kvs[0] || "",
            password = kvs[1] || "";
         let pps = this.splitPasswodArgs(password);
         return {
            username: username || "",
            password: pps.password || "",
            args: pps.args || [],
         };
      } catch (err) {
         return {
            username: "",
            password: "",
            args: [],
         };
      }
   } */

   private isHttpProtocol(str: string) {
      switch (str.slice(0, 3).toUpperCase()) {
         case "GET": //GET
         case "HEA": //HEAD
         case "PUT": //POST,PUT
         case "POST": //POST,PUT
         case "DEL": //DELETE
         case "OPT": //OPTIONS
         case "TRA": //TRACE
         case "CON": //CONNECT
            return true;
      }
      return false;
      //console.info("test", str.slice(0, 8).toUpperCase(), /^CONNECT/i.test(str.slice(0, 10).toUpperCase()))
      //return /^CONNECT/i.test(str.slice(0, 8).toUpperCase()); //  str.toUpperCase() == "CONNECT";
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
