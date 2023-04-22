import net from "net";
import Connect, { Callback } from "./connect";
import assert from "assert";
import { Socks5 } from "../core/protocol";
import { Proxy } from "../types";
import SSocket from "../core/ssocket";
import logger from "../core/logger";
import { buildSN } from "../core/password";
import * as socks5 from "./protocol/socks5";

/**
 * 走socks5代理连接
 */
export default class Socks5Connect extends Connect {
   constructor() {
      super({
         protocol: "socks5",
      });
   }
   /**
    * 连接远程代理主机
    * @param host 目标主机ip或域名
    * @param port 目标主机端口
    * @param proxy 代理服务器信息
    * @param callback 连接成功后的回调方法
    */
   public async connect(host: string, port: number, proxy: Proxy, callback: Callback): Promise<SSocket> {
      const mode = proxy.mode == undefined || String(proxy.mode) == "undefined" ? 1 : proxy.mode;
      proxy.mode = mode;
      return new Promise((resolve, reject) => {
         let isTimeout = true,
            pid;
         let socket = net.connect(proxy.port, proxy.host, async () => {
            try {
               isTimeout = false;
               pid && clearTimeout(pid);
               let ssocket = new SSocket(socket);
               ssocket.protocol = this.protocol;
               ssocket.type = "connect";
               ssocket.on("read", (data) => this.emit("read", data));
               ssocket.on("write", (data) => this.emit("write", data));
               /**     socks5协议连接 start      */
               let usePassword = !!proxy.username && !!proxy.password;
               let sendChunk = Buffer.from([0x05, 0x01, usePassword ? 0x02 : 0x00]); //0X01
               await this.write(socket, sendChunk);
               let chunkReceive: Buffer = await this.read(socket);
               usePassword = chunkReceive[0] == 0x05 && chunkReceive[1] == 0x02;
               if (chunkReceive[0] == 0x05 && chunkReceive[1] == 0xff) assert.ok(false, "socks5 no accept auth");
               if (usePassword) {
                  assert.ok(chunkReceive[0] == 0x05 && chunkReceive[1] == 0x02, "connect socks5 server auth error " + [...chunkReceive]);

                  /*   let pwd = proxy.password || "";
                  let username = Buffer.from(proxy.username || "");
                  //let password = Buffer.from(proxy.password || "");
                  let password = Buffer.from(proxy.mode == 1 ? pwd + "_" + proxy.mode + "_" + buildSN(6) : pwd + "_" + proxy.mode);
                  sendChunk = Buffer.concat([
                     Buffer.from([0x01]),
                     Buffer.from([username.byteLength]),
                     username, //
                     Buffer.from([password.byteLength]),
                     password,
                  ]); */
                  let authChunk = socks5.sendAuth({ mode, username: proxy.username || "", password: proxy.password || "" });
                  await ssocket.write(authChunk);
                  chunkReceive = await ssocket.read(1000);
                  let checked = chunkReceive[0] == 0x01 && chunkReceive[1] == 0x00;
                  //console.info("checked===", checked, proxy.port, proxy.host, socket.localPort, socket.remotePort);
                  this.emit("auth", {
                     checked: checked,
                     type: "connect",
                     protocol: "socks5",
                     session: this.getSession(socket),
                     clientIp: socket.remoteAddress || "",
                     username: proxy.username || "",
                     password: proxy.password || "",
                     args: (proxy.password || "").split("_").slice(1),
                  });
                  if (!checked) {
                     //ssocket.destroy(new Error(`HTTP/1.1 407 autherror`));
                     ssocket.end(chunkReceive);
                     callback(chunkReceive, ssocket, { host, port });
                     resolve(ssocket);
                     return;
                  }
               } else {
                  assert.ok(chunkReceive[0] == 0x05 && chunkReceive[1] == 0, "connect socks5 server error " + [...chunkReceive]);
               }

               //sendChunk = this.createClientInfo(host, port);
               sendChunk = Socks5.buildClientInfo(host, port);
               await this.write(socket, sendChunk);
               chunkReceive = await this.read(socket);
               /*         if (chunkReceive[0] == 0x05 && chunkReceive[1] == 0x00) {
               logger.debug("connect target error " + [...chunkReceive]);
               socket.destroy();
               return;
            } */
               assert.ok(chunkReceive[0] == 0x05 && chunkReceive[1] == 0x00, "connect error " + [...chunkReceive]);
               /**     socks5协议连接 end      */

               //准备连接协议
               callback(undefined, ssocket, { host, port });
               resolve(ssocket);
            } catch (err) {
               socket.emit("error", err);
            }
         });
         if (this.timeout > 0) pid = setTimeout(() => isTimeout && socket.emit("timeout"), this.timeout);
         socket.once("timeout", () => {
            let error = new Error(`HTTP/1.1 500 timeout[${this.timeout}]`);
            socket.emit("error", error);
            this.emit("timeout");
            //callback(error, new SSocket(socket));
         });
         socket.once("error", (err) => {
            socket.destroy();
            this.emit("error", err);
            callback(err, new SSocket(socket), { host, port });
            resolve(new SSocket(socket));
         });
      });
   }

   /*  private createClientInfo(host: string, port: number): Buffer {
      host = host.trim();
      let bhosts: Buffer = Buffer.from(host);
      let bufferSize = 6 + (geoip.isIpv4(host) ? 4 : bhosts.length + 1);
      let buffer: Buffer = Buffer.alloc(bufferSize, 0); // ByteBuffer.allocate(4 + bhosts.length + 2);
      let offset = 0;
      buffer.writeUInt8(0x05, offset++);
      buffer.writeUInt8(0x01, offset++);
      buffer.writeUInt8(0x00, offset++);
      if (geoip.isIpv4(host)) {
         buffer.writeUInt8(0x01, offset++);
         let vs: string[] = host.split(/\./);
         for (let i in vs) {
            let v = vs[i];
            buffer.writeUInt8(parseInt(v), offset++);
         }
      } else {
         //域名
         buffer.writeUInt8(0x03, offset++);
         buffer.writeUInt8(bhosts.length, offset++);
         buffer.write(host, offset, host.length);
         offset += host.length;
      }
      let nport: number = port & 0xffff;
      buffer.writeUInt8((nport >> 8) & 0xff, offset++);
      buffer.writeUInt8(nport & 0xff, offset++);
      return buffer;
   } */
}
