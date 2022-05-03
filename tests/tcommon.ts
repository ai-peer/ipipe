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

const tstream = new Stream();

export async function createProxyServer(port: number = 4321) {
   let ipipe = new IPipe({
      isDirect: true,
      auth: async (username, password) => {
         //console.info("check user", username, password);
         return username == "admin" && password == "123";
      },
   });
   await ipipe.createAcceptServer(port);
   ipipe.registerAccept(new LightAccept());
   ipipe.acceptFactor.on("accept", (socket, data) => {
      console.info("=======test===>accept", socket.remotePort, data);
   });

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
      connect.proxy = proxy;
      connect.connect(proxy.host, proxy.port, async (err, socket: net.Socket) => {
         //console.info("=========request http\r\n", proxy.host, proxy.port);
         let req = createHttpRequest();
         await tstream.write(socket, req);
         let chunk = await tstream.read(socket);
         //console.info("=========receive\r\n", chunk.toString());
         socket.destroy();
         resolve(chunk);
      });
   });
}
export async function requestBySocks5(proxy: Proxy): Promise<Buffer> {
   return new Promise((resolve) => {
      let connect = new Socks5Connect();
      connect.proxy = proxy;
      connect.connect(proxy.host, proxy.port, async (err, socket: net.Socket) => {
         //console.info("=========request http\r\n", proxy.host, proxy.port);
         let req = createHttpRequest();
         await tstream.write(socket, req);
         let chunk = await tstream.read(socket);
         //console.info("=========receive\r\n", chunk.toString());
         socket.destroy();
         resolve(chunk);
      });
   });
}
export async function requestByLight(proxy: Proxy): Promise<Buffer> {
   return new Promise((resolve) => {
      let connect = new LightConnect();
      connect.proxy = proxy;
      connect.connect(proxy.host, proxy.port, async (err, socket: net.Socket) => {
         //console.info("=========request http\r\n", proxy.host, proxy.port);
         let req = createHttpRequest();
         await tstream.write(socket, req);
         let chunk = await tstream.read(socket);
         socket.destroy();
         resolve(chunk);
      });
   });
}
