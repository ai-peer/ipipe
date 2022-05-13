import IPipe from "../src/index";
import LightAccept from "../src/accept/light.accept";
import HttpConnect from "../src/connect/http.connect";
import Socks5Connect from "../src/connect/socks5.connect";
import LightConnect from "../src/connect/light.connect";

import { Proxy } from "../src/types";
import net from "net";
import Stream from "../src/core/stream";
import { Transform } from "stream";
import transform from "../src/core/transform";
import * as password from "../src/core/password";
import SSocket from "../src/core/ssocket";
const tstream = new Stream();
const nsecret = password.generateRandomPassword();
console.info("nsecret", nsecret);

export async function createProxyServer(port: number = 4321) {
   let dport = 8989;
   let directProxy = new IPipe({
      isDirect: true,
      /*  auth: async (username, password) => {
         //console.info("check user", username, password);
         //return username == "admin" && password == "123";
         return true;
      }, */
   });
   let server: any = await directProxy.createAcceptServer(dport);
   directProxy.registerAccept(new LightAccept({ secret: nsecret.toString() }));
   /*    directProxy.acceptFactor.on("accept", (socket, data) => {
      console.info("=======targetProxy===>accept0", socket.remotePort, data);
   }); */
   console.info("directProxy=====", server.address(), dport);

   let relayProxy = new IPipe({
      isDirect: false,
      auth: async (username, password) => {
         //console.info("check user", username, password);
         console.info("relayProxy accept auth====", username, password);
         return username == "admin" && password == "123";
      },
   });
   relayProxy.registerProxy({ host: "127.0.0.1", port: dport, protocol: "http" });
   relayProxy.registerAccept(new LightAccept({ secret: nsecret.toString() }));
   relayProxy.acceptFactor.on("accept", (socket, data) => {
      //console.info("=======relayProxy===>accept1", socket.remotePort, data);
   });
   relayProxy.acceptFactor.on("auth", (a) => {
      console.info("relayProxy==>auth", a.checked, a.session, a.username, a.password);
   });
   let server1: any = await relayProxy.createAcceptServer(port);
   console.info("relayProxy=====", port, server1.address());
   relayProxy.on("in", (data) => {
      console.info("in", data);
   });
   relayProxy.on("out", (data) => {
      console.info("out", data);
   });
   return directProxy;
}

export function createHttpRequest(): string {
   let list: string[] = [
      "GET http://www.gov.cn/ HTTP/1.1",
      "Accept: application/json, text/plain, */*",
      "User-Agent: axios/0.25.0",
      "host: www.gov.cn",
      "Connection: close",
      "\r\n",
   ];
   return list.join("\r\n");
}

export async function requestByHttp(proxy: Proxy): Promise<Buffer> {
   return new Promise((resolve) => {
      let connect = new HttpConnect();
      //console.info("proxy", proxy);
      let totalSize = 0;
      connect.on("read", (data) => {
         totalSize += data.size;
      });
      connect.connect("www.gov.cn", 80, proxy, async (err, socket: SSocket) => {
         //console.info("=========request http\r\n", proxy.host, proxy.port);
         if (err) {
            if (err instanceof Error) {
               resolve(Buffer.from(err.message));
            } else {
               resolve(err);
            }
            return;
         }
         let req = createHttpRequest();

         //await tstream.write(socket, req);
         //let chunk = await tstream.read(socket);
         await socket.write(Buffer.from(req));
         let resList: Buffer[] = [];
         while (true) {
            if (socket.destroyed) break;
            let chunk = await socket.read(1300);
            resList.push(chunk);
         }
         let resChunk = Buffer.concat(resList);
         console.info("http=========receive\r\n", totalSize, resChunk.length, resChunk.slice(0, 128).toString(), "<<");

         socket.destroy();
         resolve(resChunk);
      });
      connect.on("auth", (data) => {
         console.info("http auth===>", data.checked, data.username, data.password, data.args);
      });
   });
}
export async function requestBySocks5(proxy: Proxy): Promise<Buffer> {
   return new Promise((resolve) => {
      let connect = new Socks5Connect();
      let totalSize = 0;
      connect.on("read", (data) => {
         totalSize += data.size;
      });
      connect.connect("www.gov.cn", 80, proxy, async (err, socket: SSocket) => {
         //console.info("=========request http\r\n", proxy.host, proxy.port);
         if (err) {
            if (err instanceof Error) {
               resolve(Buffer.from(err.message));
            } else {
               resolve(err);
            }
            return;
         }
         let req = createHttpRequest();
         //await tstream.write(socket, req);
         //let chunk = await tstream.read(socket);
         await socket.write(Buffer.from(req));
         let resList: Buffer[] = [];
         while (true) {
            if (socket.destroyed) break;
            let chunk = await socket.read(500);
            resList.push(chunk);
         }
         let resChunk = Buffer.concat(resList);
         console.info("socks5=========receive\r\n",totalSize, resChunk.length, resChunk.slice(0, 128).toString(), "<<");
         socket.destroy();
         resolve(resChunk);
      });
      connect.on("auth", (data) => {
         console.info("socks5 auth===>", data.checked, data.username, data.password, data.args);
      });
   });
}
export async function requestByLight(proxy: Proxy): Promise<Buffer> {
   return new Promise((resolve) => {
      let connect = new LightConnect();
      proxy.secret = nsecret;
      let req = createHttpRequest();
      let totalSize = 0;
      connect.on("read", (data) => {
         totalSize += data.size;
      });
      connect.connect("www.gov.cn", 80, proxy, async (err, socket: SSocket) => {
         if (err) {
            if (err instanceof Error) {
               resolve(Buffer.from(err.message));
            } else {
               resolve(err);
            }
            return;
         }
         console.info("light connect ok", !!socket.cipher);
         console.info("light req===", req.toString());
         //await tstream.write(socket, req);
         //let chunk = await tstream.read(socket);
         await socket.write(Buffer.from(req));
         let resList: Buffer[] = [];
         while (true) {
            if (socket.destroyed) break;
            let chunk = await socket.read(500);
            resList.push(chunk);
         }
         let resChunk = Buffer.concat(resList);
         console.info("light=========receive\r\n", totalSize, resChunk.length, resChunk.slice(0, 128).toString(), "<<");
         socket.destroy();
         resolve(resChunk);
      });
      connect.on("auth", (data) => {
         console.info("light connect auth===>", data.checked, data.username, data.password, data.args);
      });
   });
}
