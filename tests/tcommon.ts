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

const tstream = new Stream();
const nsecret = password.generateRandomPassword();
console.info("nsecret", nsecret);

export async function createProxyServer(port: number = 4321) {
   let dport = 8989;
   let ipipe = new IPipe({
      isDirect: true,
     /*  auth: async (username, password) => {
         //console.info("check user", username, password);
         //return username == "admin" && password == "123";
         return true;
      }, */
   });
   let server: any = await ipipe.createAcceptServer(dport);
   ipipe.registerAccept(new LightAccept({secret: nsecret.toString()}));
   ipipe.acceptFactor.on("accept", (socket, data) => {
      console.info("=======test===>accept0", socket.remotePort, data);
   });
   console.info("server=====", server.address(), dport);

   let ipipe1 = new IPipe({
      isDirect: false,
      auth: async (username, password) => {
         //console.info("check user", username, password);
         console.info("ipipe1 accept check====", username, password);
         return username == "admin" && password == "123";
      },
   });
   ipipe1.registerProxy({ host: "127.0.0.1", port: dport, protocol: "http" });
   ipipe1.registerAccept(new LightAccept({secret: nsecret.toString()}));
   ipipe1.acceptFactor.on("accept", (socket, data) => {
      console.info("=======test===>accept1", socket.remotePort, data);
   });
   ipipe1.acceptFactor.on("auth", (a) => {
      console.info("ipipe1==>auth", a.checked, a.session, a.username, a.password);
   });
   let server1: any = await ipipe1.createAcceptServer(port);
   console.info("server=====1", port, server1.address());

   return ipipe;
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
      console.info("proxy", proxy)
      connect.connect("www.gov.cn", 80, proxy, async (err, socket: net.Socket) => {
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
         await tstream.write(socket, req);
         let chunk = await tstream.read(socket);
         console.info("http=========receive\r\n", chunk.toString());
         socket.destroy();
         resolve(chunk);
      });
      connect.on("auth", (data) => {
         console.info("http auth===>", data.checked, data.username, data.password, data.args);
      });
   });
}
export async function requestBySocks5(proxy: Proxy): Promise<Buffer> {
   return new Promise((resolve) => {
      let connect = new Socks5Connect();
      connect.connect("www.gov.cn", 80, proxy, async (err, socket: net.Socket) => {
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
         await tstream.write(socket, req);
         let chunk = await tstream.read(socket);
         console.info("socks5=========receive\r\n", chunk.toString());
         socket.destroy();
         resolve(chunk);
      });
      connect.on("auth", (data) => {
         console.info("socks5 auth===>", data.checked, data.username, data.password, data.args);
      });
   });
}
export async function requestByLight(proxy: Proxy): Promise<Buffer> {
   return new Promise((resolve) => {
      
      let connect = new LightConnect({secret: nsecret});
      proxy.secret = nsecret;
      connect.connect("www.gov.cn", 80, proxy, async (err, socket: net.Socket) => {
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
         await tstream.write(socket, req);
         let chunk = await tstream.read(socket);
         console.info("light=========receive\r\n", chunk.toString());
         socket.destroy();
         resolve(chunk);
      });
      connect.on("auth", (data) => {
         console.info("test connect light auth===>", data.checked, data.username, data.password, data.args);
      });
   });
}
