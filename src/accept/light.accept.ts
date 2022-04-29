import Accept from "./accept";
import net from "net";
import logger from "../core/logger";
import { bit2Int } from "../utils";
import transform from "src/core/transform";
import { AcceptOptions } from "../types";

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
      let versions = [...firstChunk.slice(7, 9)].map((v) => v ^ 0xf1);
      let face = versions[0];
      /** 解析首次http请求协议获取反馈和主机信息 start */
      //let err = await this.write(socket, cipherConnect.encode(Buffer.from([0x05, 0x00].concat(randomArray())), face), (size) => (outSize += size));

      let host = "",
         port = 0;

      /** 解析首次http请求协议获取反馈和主机信息 end */
      this.connect(
         host,
         port,
         socket,
         firstChunk,
         transform((chunk, encoding, callback) => {
            callback(null, chunk);
         }),
      );
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

   private isAcceptProtocol(chunk: Buffer) {
      let versions = [...chunk.slice(7, 9)].map((v) => v ^ 0xf1);
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
