import { Proxy } from "../types";
import { LightConnect, SSocket, Socks5Connect, HttpConnect } from "../";
import ua from "./ua";
const reqUrl = "http://httpbin.org/ip";
//const reqUrl = "https://ifconfig.me/all.json";

export async function check(proxy: Proxy, url: string = reqUrl): Promise<boolean> {
   if (proxy.protocol == "http") {
      return checkHttp(proxy, url);
   } else if (proxy.protocol == "socks5") {
      return checkSocks5(proxy, url);
   } else if (proxy.protocol == "light") {
      return checkLight(proxy, url);
   }
   return false;
}

export async function checkSocks5(proxy: Proxy, url: string = reqUrl): Promise<boolean> {
   let connect = new Socks5Connect();
   const info = new URL(url);
   return new Promise((resolve) => {
      connect.on("timeout", () => {
         console.info(`check socks5 timeout proxy=${proxy.protocol}://${proxy.host}:${proxy.port}`);
         resolve(false);
      });
      connect.connect(info.host, parseInt(info.port) || 80, proxy, async (err, socket) => {
         let data = await request(url, socket);
         let code = data.slice(0, 12).split(" ")[1];
         let checked = code == "200";
         if (!checked) {
            console.info(`check socks5 false proxy=${proxy.protocol}://${proxy.host}:${proxy.port}`);
            console.info(data.slice(0, 256));
         }
         resolve(checked);
      });
   });
}
export async function checkHttp(proxy: Proxy, url: string = reqUrl): Promise<boolean> {
   let connect = new HttpConnect();
   const info = new URL(url);
   return new Promise((resolve) => {
      connect.on("timeout", () => {
         console.info(`check http timeout proxy=${proxy.protocol}://${proxy.host}:${proxy.port}`);
         resolve(false);
      });
      connect.connect(info.host, parseInt(info.port) || 80, proxy, async (err, socket) => {
         let data = await request(url, socket);
         let code = data.slice(0, 12).split(" ")[1];
         let checked = code == "200";
         if (!checked) {
            console.info(`check http false proxy=${proxy.protocol}://${proxy.host}:${proxy.port}`);
            console.info(data.slice(0, 256));
         }
         resolve(checked);
      });
   });
}
export async function checkLight(proxy: Proxy, url: string = reqUrl): Promise<boolean> {
   let connect = new LightConnect();
   const info = new URL(url);
   return new Promise((resolve) => {
      connect.on("timeout", () => {
         console.info(`check light timeout proxy=${proxy.protocol}://${proxy.host}:${proxy.port}`);
         resolve(false);
      });
      connect.connect(info.host, parseInt(info.port) || 80, proxy, async (err, socket) => {
         let data = await request(url, socket);
         let code = data.slice(0, 12).split(" ")[1];
         let checked = code == "200";
         if (!checked) {
            console.info(`check light false proxy=${proxy.protocol}://${proxy.host}:${proxy.port}`);
            console.info(data.slice(0, 256));
         }
         resolve(checked);
      });
   });
}
async function request(url: string, socket: SSocket): Promise<string> {
   let req = buildHttpRequest(url);
   //console.info("req===", req);
   //await socket.read(100);
   await socket.write(Buffer.from(req));

   let resList: Buffer[] = [];
   while (true) {
      if (socket.destroyed) break;
      let chunk = await socket.read(500);
      resList.push(chunk);
   }
   let resChunk = Buffer.concat(resList);
   socket.destroy();
   return resChunk.toString();
}
export function buildHttpRequest(url: string): string {
   let uu = new URL(url);
   let list: string[] = [
      `GET ${uu.protocol}//${uu.hostname}/${uu.pathname.replace(/^\/+/g, "")} HTTP/1.1`,
      "Accept: application/json, text/plain, */*",
      `User-Agent: ${ua.build()}`,
      `host: ${uu.hostname}`,
      "Connection: close",
      "\r\n",
   ];
   return list.join("\r\n");
}
