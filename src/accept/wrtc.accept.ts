import Accept from "./accept";
import net, { SocketAddress } from "net";
import { AcceptOptions, ConnectUser } from "../types";
import logger from "../core/logger";
import SSocket from "../core/ssocket";
import * as http from "../connect/protocol/http";

/**
 * Http协议接入类
 */
export default class WrtcAccept extends Accept {
   constructor(options?: AcceptOptions) {
      super(options);
      this.protocol = "wrtc";
   }

   public async isAccept(socket: net.Socket, chunk: Buffer): Promise<boolean> {
      let str = chunk.toString();
      return this.isWrtcProtocol(str);
   }
   public async handle(socket: net.Socket, firstChunk: Buffer) {
      let ssocket = new SSocket(socket);
      ssocket.protocol = this.protocol;
      ssocket.type = "accept";
      const handle = async (ssocket: SSocket, firstChunk: Buffer) => {
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
            ssocket.write(Buffer.from(`WRTC/1.0 400 badheader`));
            return;
         }
         //let connectTargetStr = connectStr.replace(/Proxy-Authorization: Basic .*[\r\n]+/i, "");
         //firstChunk = Buffer.from(connectTargetStr);

         let user: ConnectUser | undefined = http.parseHttpUser(headers["proxy-authorization"]);

         let isAuth = !!this.acceptAuth;
         //if (this.options.isDirect && !user.username) isAuth = false;
         //console.info("accept wrtc", headers, isAuth, this.protocol, this.options, user.username + "/" + user.password, connectStr);
         // 需要鉴权
         if (isAuth) {
            this.sessions.add(socket, user.username);
            const session = this.getSession(socket);
            const clientIp = socket.remoteAddress || "";
            let authRes = false;
   /*          if (this.options.username && this.options.password) {
               authRes = this.options.username == user.username && this.options.password == user.password;
            } */
            if (!authRes) {
               authRes = !!this.acceptAuth
                  ? await this.acceptAuth({
                       username: user.username,
                       password: user.password,
                       args: user.args, //
                       //socket: socket,
                       protocol: this.protocol,
                       session,
                       clientIp,
                    })
                  : false;
            }
            //if (!authRes) console.info("accc auth", authRes, this.acceptAuth);
            //console.info("accept s3",authRes, this.getSession(socket), user);
            this.emit("auth", {
               checked: authRes,
               type: "accept",
               protocol: "wrtc",
               session, //
               username: user.username,
               password: user.password,
               args: user.args,
               clientIp,
            });
            //console.info("accept auth res", authRes);

            if (!authRes) {
               //this.end(socket, Buffer.from(["HTTP/1.0 407 autherror", "Proxy-Authorization: ", "\r\n"].join("\r\n")));
               await ssocket.end(Buffer.from(["WRTC/1.0 407 autherror", "Proxy-Authorization: ", "\r\n"].join("\r\n")));
               //logger.debug(`===>auth error http username=${user.username} password=${user.password}`);
               return;
            }
            //user =
         }

         //if (/^WRTC\//i.test(connectTargetStr)) {
         //port = parseInt(hp[1]) || 443;
         await ssocket.write(Buffer.from(`WRTC-OS/1.0 200 Connection Established\r\n\r\n`));
         firstChunk = await ssocket.read(5000);
         //}
         /** 解析首次http请求协议获取反馈和主机信息 end */

         this.connect(host, port, ssocket, firstChunk, user);
      };
      handle(ssocket, firstChunk);

      ssocket.on("reset", async (ssocket: SSocket) => {
         let firstChunk = await ssocket.read(5000);
         if (firstChunk.byteLength <= 1) return;
         //console.info("connect>>>>>", firstChunk.toString());
         handle(ssocket, firstChunk);
      });
   }

   private isWrtcProtocol(str: string) {
      /*  switch (str.slice(0, 3).toUpperCase()) {
         case "GET": //GET
         case "HEA": //HEAD
         case "PUT": //POST,PUT
         case "POST": //POST,PUT
         case "DEL": //DELETE
         case "OPT": //OPTIONS
         case "TRA": //TRACE
         case "CON": //CONNECT
            return true;
      } */

      return /^WRTC\//.test(str);
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
