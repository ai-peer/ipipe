import IPipe, { WrtcAccept, WrtcConnect, SSocket } from "../src";
import XPeer from "../src/core/xpeer";
import fetch from "../src/utils/fetch";
process.on("uncaughtException", (err) => {});
process.on("unhandledRejection", (err) => {});
async function createServer() {
   const ipipe = new IPipe({
      peerId: "accept-goxxx",
      isDirect: false,
   });
   //ipeer.registerAccept(new WrtcAccept());
   ipipe.registerProxy({
      protocol: "wrtc",
      host: "accept-go",
      port: 0,
      username: "admin",
      password: "123",
   });
   ipipe.on("auth", (data) => console.info("event log auth", data.checked, data.type));
   ipipe.on("accept", (data) => console.info("event log accept", data.protocol));
   await ipipe.createAcceptServer(1082);
   //ipipe.on("accept", (data) => console.info("accept", data.protocol));

   /*    const ipeerAccept = new IPeer({});
   await ipeerAccept.createAcceptServer(1070);
   ipeerAccept.registerProxy({
      protocol: "wrtc",
      host: "accept-go",
      port: 0,
   }); */
   return new Promise((resolve) => {
      ipipe.once("open", () => {
         resolve(undefined);
      });
   });
}
async function test1() {
   console.info("fetch");
   let res = await fetch({
      url: "http://www.gov.cn/",
      proxy: {
         host: "127.0.0.1",
         port: 1082,
         auth: {
            username: "admin",
            password: "123",
         },
      },
   });
   let text = (await res.text()) || "";
   console.info("res===", res.status, text.length, text.substring(0, 128));
}
async function test() {
   new XPeer();
   const info = new URL("http://www.gov.cn/");
   let list: string[] = [
      `GET ${info.origin} HTTP/1.1`,
      "Accept: application/json, text/plain, */*",
      "User-Agent: axios/0.25.0",
      `host: ${info.hostname}`,
      "Connection: close",
      "\r\n",
   ];
   const connect = new WrtcConnect();
   let startTime = Date.now();
   connect.on("error", () => {});
   connect.once("close", () => console.info("close"));
   connect.on("auth", (data) => console.info("auth", data));
   connect.connect(
      info.hostname,
      80,
      {
         host: "accept-go",
         port: 0,
         protocol: "wrtc",
         username: "admin",
         password: "123",
      },
      async (err, socket: SSocket) => {
         console.info("connect ttl", Date.now() - startTime);
         let list: string[] = [
            `GET ${info.origin} HTTP/1.1`,
            "Accept: application/json, text/plain, */*",
            "User-Agent: axios/0.25.0",
            `host: ${info.hostname}`,
            "Connection: close",
            "\r\n",
         ];
         //await tstream.write(socket, list.join("\r\n"));
         await socket.write(list.join("\r\n"));
         //let chunk = await tstream.read(socket);
         let chunk = await socket.read(15 * 1000);
         console.info("get res log", chunk.length, chunk.slice(0, 1024).toString());
         socket.destroy();
      },
   );
}

(async () => {
   await createServer();
   test1();
   //await test();
})();
