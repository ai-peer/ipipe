import Accept from "./accept";
import net, { SocketAddress } from "net";
import { AcceptOptions, ConnectUser } from "../types";
import logger from "../core/logger";
import SSocket from "../core/ssocket";
import * as http from "../connect/protocol/http";

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
      let connectStr = firstChunk.toString();
      let headers = parseHeader(connectStr);
      let hp = headers["host"]?.split(":");
      let host = hp[0],
         port = parseInt(hp[1]) || 80;
      if (!host) {
         ssocket.write(Buffer.from(`HTTP/1.0 400 badheader`));
         return;
      }
      let connectTargetStr = connectStr.replace(/Proxy-Authorization: Basic .*[\r\n]+/i, "");
      firstChunk = Buffer.from(connectTargetStr);

      let user: ConnectUser | undefined = http.parseHttpUser(headers["proxy-authorization"]);
      let isAuth = !!this.acceptAuth;
      //if (this.options.isDirect && !user.username) isAuth = false;
      //console.info("accept http", isAuth, this.protocol, this.options, user.username + "/" + user.password, connectStr);
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
         //console.info("accept auth res", authRes);

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

      if (/^CONNECT/i.test(connectTargetStr)) {
         port = parseInt(hp[1]) || 443;
         await ssocket.write(Buffer.from(`HTTP/1.1 200 Connection Established\r\n\r\n`));
         firstChunk = await ssocket.read(500);
         //console.info("firstChunk===", firstChunk.toString(), host, port);
      }
      /** 解析首次http请求协议获取反馈和主机信息 end */
      //console.info("connect>>>>>", host, port, firstChunk.toString());
      this.connect(host, port, ssocket, firstChunk, user);
   }

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
