import Accept from "./accept";
import net from "net";
import { parseSocks5IpPort, isIpv4, isIpv6, isDomain, validSocks5Target } from "../core/geoip";
import { AcceptOptions, ConnectUser } from "../types";
import logger from "../core/logger";
import SSocket from "../core/ssocket";

/**
 * socks5协议接入类
 */
export default class Socks5Accept extends Accept {
   constructor(options?: AcceptOptions) {
      super(options);
      this.protocol = "socks5";
   }

   public async isAccept(socket: net.Socket, chunk: Buffer): Promise<boolean> {
      let res = this.isSocks5(chunk);
      return res;
   }
   public async handle(socket: net.Socket, chunk: Buffer) {
      let ssocket = new SSocket(socket);
      ssocket.protocol = this.protocol;
      ssocket.on("read", (data) => this.emit("read", data));
      ssocket.on("write", (data) => this.emit("write", data));
      /** 解析首次 socks5 请求协议获取反馈和主机信息 start */
      //let options = this.options;
      let isAuth = chunk[2] == 2 || !!this.acceptAuth;
      let _this = this;
      let isReadTargetInfo = false;
      setTimeout(() => {
         if (!isReadTargetInfo) {
            socket.destroy(new Error("本地接入网络超时"));
         }
      }, 1000);
      /** 三步走 start */
      await ssocket.write(Buffer.from([0x05, isAuth ? 0x02 : 0x00])); //响应客户端连接

      let user: ConnectUser | undefined;
      // 需要鉴权
      if (isAuth) {
         let userChunk = await _this.read(socket); //读取将要建立连接的目标服务,
         if (userChunk[0] != 1) {
            this.end(socket, Buffer.from([0x01, 0x01]));
            return;
         }
         user = this.getUser(userChunk);

         this.sessions.add(socket, user.username);
         const session = this.getSession(socket);
         const clientIp = socket.remoteAddress || "";

         let authRes = this.acceptAuth
            ? await this.acceptAuth({
                 username: user.username,
                 password: user.password,
                 args: user.args, //
                 // socket: socket,
                 protocol: this.protocol,
                 session,
                 clientIp,
              })
            : true;
         this.sessions.add(socket, user.username);
         this.emit("auth", {
            checked: authRes,
            type: "accept",
            session,
            clientIp, //
            username: user.username,
            password: user.password,
            args: user.args,
         });
         if (!authRes) {
            ssocket.destroy(new Error(`HTTP/1.1 407 noauth`));
            return;
         }
         await ssocket.write(Buffer.from([0x01, 0x00]));
      } else {
         this.sessions.add(socket);
      }

      let targetInfoBuffer = await _this.read(socket); //读取将要建立连接的目标服务,
      isReadTargetInfo = true;
      let { host, port, atyp } = parseSocks5IpPort(targetInfoBuffer); //读取将要建立连接的目标服务
      let validRes = validSocks5Target(socket, { host, port, atyp });
      if (!validRes) {
         socket.destroy();
         return;
      }
      //await _this.write(socket, Buffer.from([0x05, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00])); //返回告诉
      await ssocket.write(Buffer.from([0x05, 0x00, 0x00, ...targetInfoBuffer.slice(3)])); //返回告诉
      //await _this.write(socket, Buffer.concat([Buffer.from([0x05, 0x00, 0x00]), targetInfoBuffer.slice(3)])); //返回告诉
      /** 三步走 end */
      let sendData = await ssocket.read(500);

      /** 解析首次 socks5 请求协议获取反馈和主机信息 end */

      this.connect(host, port, ssocket, sendData, user);
   }

   private isSocks5(buffer: Buffer): boolean {
      if (buffer[0] == 5 && [1, 2, 3, 4, 5].includes(buffer[1]) && [0, 2].includes(buffer[2])) {
         return true;
      }
      return false;
   }
   private getUser(chunk: Buffer): ConnectUser {
      //let auth = this.options.auth;
      let userLength = chunk[1];
      let passLength = chunk[2 + userLength];
      let username = chunk.slice(2, 2 + userLength);
      let password = chunk.slice(3 + userLength, 3 + userLength + passLength);
      /*  return {
         username: username.toString(),
         password: password.toString(),
      }; */
      let pps = this.splitPasswodArgs(password.toString());
      return {
         username: username.toString(),
         password: pps.password,
         args: pps.args,
      };
   }
}
