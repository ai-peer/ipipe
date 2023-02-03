import net from "net";
import Connect, { Callback } from "./connect";
import { ConnectOptions, DefaultSecret, Proxy } from "../types";
import Cipher from "../core/cipher";
import { int2Bit } from "../utils";
import assert from "assert";
import os from "os";
import pkg from "../../package.json";
import { Socks5 } from "../core/protocol";
import { buildSN } from "../core/password";
import SSocket from "../core/ssocket";

/**
 * light协议连接
 */
export default class LightConnect extends Connect {
   constructor(options?: ConnectOptions) {
      super({
         ...options,
         protocol: "light",
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
      let secret = proxy.secret || DefaultSecret;
      let cipherConnect = Cipher.createCipher(secret);
      proxy.mode = proxy.mode == undefined || String(proxy.mode) == "undefined" ? 1 : proxy.mode;
      return new Promise((resolve, reject) => {
         let isTimeout = true,
            pid;
         let socket = net.connect(proxy.port, proxy.host, async () => {
            try {
               isTimeout = false;
               pid && clearTimeout(pid);
               //====step1 connect
               let versions: number[] = int2Bit(cipherConnect.buildVersion(3), 3);
               let face = versions[1];
               let version = Buffer.from(versions.map((v) => v ^ 0xf1)); //; //Buffer.from([cipherConnect.version]);
               let protocol = Buffer.from("light").map((v, i) => v ^ versions[i % versions.length]);
               let step1Req: Buffer = Buffer.concat([
                  protocol, //
                  Buffer.from(int2Bit(cipherConnect.buildVersion(2), 2)),
                  version,
                  Buffer.from(buildSN(Math.ceil(Math.random() * 5))), //填充随机数
               ]);
               await this.write(socket, cipherConnect.encode(step1Req, 49));

               let step1Res: Buffer = await this.read(socket);
               step1Res = cipherConnect.decode(step1Res, face);
               assert.ok(step1Res[0] == 0x05 && step1Res[1] == 0x00, "light connect error, maybe secret error");

               let pwd = proxy.password || "";
               let username = Buffer.from(proxy.username || "");
               let password = Buffer.from(proxy.mode == 1 ? pwd + "_" + proxy.mode + "_" + buildSN(6) : pwd + "_" + proxy.mode);
               let step2Chunk = Buffer.concat([
                  Buffer.from([0x01]),
                  Buffer.from([username.byteLength]),
                  username, //
                  Buffer.from([password.byteLength]),
                  password,
               ]);
               await this.write(socket, cipherConnect.encode(step2Chunk, face));

               let step2Res = await this.read(socket);
               step2Res = cipherConnect.decode(step2Res, face);

               let checked = step2Res[0] == 0x01 && step2Res[1] == 0x00;
               //this.emit("auth", { checked: checked, socket, username: proxy.username, password: proxy.password, args: (proxy.password||"").split("_").slice(1).join("_")});
               //assert.ok(step2Res[0] == 0x01 && step2Res[1] == 0x00, "auth error");
               this.emit("auth", {
                  checked: checked,
                  type: "connect",
                  protocol: "light",
                  session: this.getSession(socket),
                  clientIp: socket.remoteAddress || "",
                  username: proxy.username || "",
                  password: proxy.password || "",
                  args: (proxy.password || "").split("_").slice(1),
               });
               if (!checked) {
                  let ssocket = new SSocket(socket);
                  callback(step2Res, ssocket, { host, port });
                  resolve(ssocket);
                  return;
               }

               let dynamicSecret = step2Res.slice(2, 258);
               let cipherTransport = Cipher.createCipher(dynamicSecret);
               //创建加密连接
               let ssocket = new SSocket(socket, cipherTransport, face);
               ssocket.protocol = this.protocol;
               ssocket.type = "connect";
               ssocket.on("read", (data) => this.emit("read", data));
               ssocket.on("write", (data) => this.emit("write", data));

               let step3Req = Socks5.buildClientInfo(host, port);
               step3Req = cipherTransport.encode(step3Req, face);
               await this.write(socket, step3Req);
               let step3Res = await this.read(socket);
               step3Res = cipherTransport.decode(step3Res, face);
               assert.ok(step3Res[0] == 0x01 && step3Res[1] == 0x00, "light connect end fail");

               ssocket.heartbeat();
               //准备连接协议
               callback(undefined, ssocket, { host, port });
               resolve(ssocket);
            } catch (err) {
               socket.emit("error", err);
            }
         });
         if (this.timeout > 0) pid = setTimeout(() => isTimeout && socket.emit("timeout"), this.timeout);
         socket.once("timeout", () => {
            let error = new Error("timeout " + this.timeout);
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
}
