import Accept from "./accept";
import net from "net";
import logger from "../core/logger";
import { bit2Int } from "../utils";
import transform from "../core/transform";
import { AcceptOptions, DefaultSecret, ConnectUser } from "../types";
import Cipher from "../core/cipher";
import { generateRandomPassword } from "../core/password";
import { parseSocks5IpPort, validSocks5Target } from "../core/geoip";
/**
 * Light协议接入类
 */
export default class LightAccept extends Accept {
   private cipherAccept: Cipher;
   constructor(options?: AcceptOptions) {
      super(options);
      this.protocol = "light";
      let secret = this.options.secret || DefaultSecret;
      this.cipherAccept = Cipher.createCipher(secret); //接入密钥
   }

   public async isAccept(socket: net.Socket, chunk: Buffer): Promise<boolean> {
      return this.isAcceptProtocol(chunk);
   }
   public async handle(socket: net.Socket, firstChunk: Buffer) {
      let cipherAccept = this.cipherAccept;
      firstChunk = this.cipherAccept.decode(firstChunk, 49);
      let versions = [...firstChunk.slice(7, 10)].map((v) => v ^ 0xf1);
      let face = versions[1];
      /** 解析首次http请求协议获取反馈和主机信息 start */
      let step1Res = Buffer.from([0x05, 0x00].concat(randomArray()));
      await this.write(socket, cipherAccept.encode(step1Res, face));

      //======= step2 鉴权 start
      let step2Req = await this.read(socket); //读取将要建立连接的目标服务,
      step2Req = cipherAccept.decode(step2Req, face);
      let user = this.getUser(step2Req);
      let authRes = this.acceptAuth ? await this.acceptAuth(user.username, user.password) : true;
      //console.info("auth res =", authRes, !!this.acceptAuth);
      this.sessions.add(socket, user.username);
      if (!authRes) {
         this.end(socket, cipherAccept.encode(Buffer.from([0x01, 0x01]))); //鉴权失败
         logger.debug(`===>auth error username=${user.username} password=${user.password}`);
         this.emit("auth", { checked: authRes, socket, username: user.username, password: user.password, args: user.args });
         return;
      }

      //await this.write(socket, cipherAccept.encode(Buffer.from([0x01, 0x00])));
      //======= step2 鉴权 end

      //======= step3 下发动态密钥 start
      let dynamicSecret = generateRandomPassword(false);
      let cipherTransport = Cipher.createCipher(dynamicSecret);
      let dynamicSecret1 = dynamicSecret instanceof Buffer ? dynamicSecret : Buffer.from(dynamicSecret);
      let step3Res: Buffer = Buffer.concat([Buffer.from([0x01, 0x00]), dynamicSecret1]);
      await this.write(socket, cipherAccept.encode(step3Res, face));
      //======= step3 下发动态密钥 end

      //======= step4 获取目标服务信息 start
      let step4Req: Buffer = await this.read(socket);
      step4Req = cipherTransport.decode(step4Req, face);
      let { host, port, atyp } = parseSocks5IpPort(step4Req); //读取将要建立连接的目标服务
      let validRes = validSocks5Target(socket, { host, port, atyp });
      if (!validRes) {
         socket.destroy();
         return;
      }
      //======= step4 获取目标服务信息 end
      //通知成功
      await this.write(socket, cipherTransport.encode(Buffer.from([0x01, 0x00]), face)); //返回告诉

      let sendData = cipherTransport.decode(await this.read(socket, 500), face);

      /** 解析首次http请求协议获取反馈和主机信息 end */
      this.connect(
         host,
         port,
         socket,
         sendData,
         user,
         transform((chunk, encoding, callback) => {
            chunk = cipherTransport.decode(chunk, face);
            callback(null, chunk);
         }),
      );
   }
   /**
    * 获取鉴权用户信息
    * @param chunk
    */
   private getUser(chunk: Buffer): ConnectUser {
      let userLength = chunk[1];
      let passLength = chunk[2 + userLength];
      let username = chunk.slice(2, 2 + userLength);
      let password = chunk.slice(3 + userLength, 3 + userLength + passLength);
      let pps = this.splitPasswodArgs(password.toString());
      return {
         username: username.toString(),
         password: pps.password,
         args: pps.args,
      };
      /*  return {
         username: username.toString(),
         password: password.toString(),
      }; */
   }

   private isAcceptProtocol(chunk: Buffer) {
      chunk = this.cipherAccept.decode(chunk, 49);
      let versions = [...chunk.slice(7, 10)].map((v) => v ^ 0xf1);
      //let face = versions[0];
      let version = bit2Int(versions); //
      version = version >= Math.pow(2, 16) / 2 ? 0 : version;
      /* let device = Buffer.from(chunk.slice(0, 16).map((v, i) => v ^ versions[i % versions.length]))
         .toString("hex")
         .toUpperCase(); */
      let protocol = chunk
         .slice(0, 5)
         .map((v, i) => v ^ versions[i % versions.length])
         .toString()
         .toLowerCase();
      return protocol == "light";
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

function randomArray(length: number = 0): number[] {
   let list: number[] = [];
   let size = length > 0 ? length : Math.ceil(Math.random() * 5);
   for (let i = 0; i < size; i++) list.push(Math.floor(Math.random() * 256));
   return list;
}
