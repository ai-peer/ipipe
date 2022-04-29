import Accept from "./accept";
import net from "net";
import logger from "../core/logger";
import { bit2Int } from "../utils";
import transform from "src/core/transform";
import { AcceptOptions, DefaultSecret } from "../types";
import Cipher from "../core/cipher";
import { generateRandomPassword } from "../core/password";
import { parseSocks5IpPort, validSocks5Target } from "../core/geoip";
/**
 * Light协议接入类
 */
export default class LightAccept extends Accept {
   constructor(options?: AcceptOptions) {
      super(options);
      this.protocol = "light";
   }

   public async isAccept(socket: net.Socket, chunk: Buffer): Promise<boolean> {
      return this.isAcceptProtocol(chunk);
   }
   public async handle(socket: net.Socket, firstChunk: Buffer) {
      let secret = this.options.secret || DefaultSecret;
      let versions = [...firstChunk.slice(7, 10)].map((v) => v ^ 0xf1);
      let face = versions[1];

      let cipherAccept: Cipher = Cipher.createCipher(secret); //接入密钥
      /** 解析首次http请求协议获取反馈和主机信息 start */
      await this.write(socket, cipherAccept.encode(Buffer.from([0x05, 0x00].concat(randomArray())), face));

      //======= step2 鉴权 start
      let userChunk = await this.read(socket); //读取将要建立连接的目标服务,
      userChunk = cipherAccept.decode(userChunk, face);
      let user = this.getUser(userChunk);
      let authRes = this.acceptAuth ? await this.acceptAuth(user.username, user.password) : true;
      //console.info("auth res =", authRes);
      if (!authRes) {
         this.end(socket, cipherAccept.encode(Buffer.from([0x01, 0x01]))); //鉴权失败
         return;
      }
      //await this.write(socket, cipherAccept.encode(Buffer.from([0x01, 0x00])));
      //======= step2 鉴权 end

      //======= step3 下发动态密钥 start
      let dynamicSecret = generateRandomPassword(false);
      let cipherTransport = Cipher.createCipher(dynamicSecret);
      let dynamicSecret1 = dynamicSecret instanceof Buffer ? dynamicSecret : Buffer.from(dynamicSecret);
      let sendOkAndSecret: Buffer = Buffer.concat([Buffer.from([0x01, 0x00]), dynamicSecret1]);
      await this.write(socket, cipherAccept.encode(sendOkAndSecret, face));
      //======= step3 下发动态密钥 end

      //======= step4 获取目标服务信息 start
      let targetBuffer: Buffer = await this.read(socket);
      let targetDecode: Buffer = cipherTransport.decode(targetBuffer, face);
      let { host, port, atyp } = parseSocks5IpPort(targetDecode); //读取将要建立连接的目标服务
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
   private getUser(chunk: Buffer) {
      let userLength = chunk[1];
      let passLength = chunk[2 + userLength];
      let username = chunk.slice(2, 2 + userLength);
      let password = chunk.slice(3 + userLength, 3 + userLength + passLength);
      return {
         username: username.toString(),
         password: password.toString(),
      };
   }

   private isAcceptProtocol(chunk: Buffer) {
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
