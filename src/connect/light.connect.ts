import net from "net";
import Connect, { Callback } from "./connect";
import { ConnectOptions, DefaultSecret } from "../types";
import Cipher from "../core/cipher";
import { int2Bit } from "../../../lion-proxy-client/src/core/util";
import assert from "assert";
import os from "os";
import pkg from "../../package.json";
import { Socks5 } from "../core/protocol";

/**
 * light协议连接
 */
export default class LightConnect extends Connect {
   constructor(options: ConnectOptions) {
      super({
         ...options,
         protocol: "light",
      });
   }

   public async connect(host: string, port: number, callback: Callback): Promise<net.Socket> {
      let secret = this.options.secret || DefaultSecret;
      let cipherConnect = Cipher.createCipher(secret);
      return new Promise((resolve, reject) => {
         let proxy = this.proxy;
         let socket = net.connect(proxy.port, proxy.host, async () => {
            //====step1 connect
            let versions: number[] = int2Bit(cipherConnect.buildVersion(3), 3);
            let face = versions[1];
            let version = Buffer.from(versions.map((v) => v ^ 0xf1)); //; //Buffer.from([cipherConnect.version]);
            let protocol = Buffer.from("light").map((v, i) => v ^ versions[i % versions.length]);
            let step1Chunk: Buffer = Buffer.concat([protocol, Buffer.from(int2Bit(cipherConnect.buildVersion(2), 2)), version]);
            await this.write(socket, cipherConnect.encode(step1Chunk, face));

            let step1Res: Buffer = await this.read(socket);
            step1Res = cipherConnect.decode(step1Res, face);
            assert.ok(step1Res[0] == 0x05 && step1Res[1] == 0x01, "connect error");

            let username = Buffer.from(proxy.username || "");
            let password = Buffer.from(proxy.password || "");
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
            assert.ok(step2Res[0] == 0x01 && step2Res[1] == 0x00, "auth error");

            let dynamicSecret = step2Res.slice(2, 258);
            let cipherTransport = Cipher.createCipher(dynamicSecret);

            let step3Req = Socks5.buildClientInfo(host, port);
            step3Req = cipherTransport.encode(step3Req, face);
            await this.write(socket, step3Req);

            let step3Res = await this.read(socket);
            step3Res = cipherTransport.decode(step3Res, face);
            assert.ok(step3Res[0] == 0x05 && step3Res[1] == 0x00, "light connect end fail");

            //准备连接协议
            callback(undefined, socket);
            resolve(socket);
         });
         socket.setTimeout(15000);
         socket.on("error", (err) => {
            socket.destroy(err);
            callback(err, socket);
         });
      });
   }
}