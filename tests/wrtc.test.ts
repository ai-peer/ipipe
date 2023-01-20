import IPipe, { WrtcAccept, WrtcConnect, SSocket } from "../src";
import XPeer from "../src/core/xpeer";
import IPeer from "@ai-lion/ipeer";

async function createServer() {
   const ipipe = new IPipe({
      peerId: "accept-go",
      isDirect: true,
   });
   //ipeer.registerAccept(new WrtcAccept());
   await ipipe.createAcceptServer(1071);
   //ipipe.on("accept", (data) => console.info("accept", data.protocol));

   /*    const ipeerAccept = new IPeer({});
   await ipeerAccept.createAcceptServer(1070);
   ipeerAccept.registerProxy({
      protocol: "wrtc",
      host: "accept-go",
      port: 0,
   }); */
}
async function test1() {
   const id = "xxaabbcdx";
   let ipeer = new IPeer(id, {
      token: id,
   });
   ipeer.on("open", () => {
      console.info("open", ipeer.id);
      let socket = ipeer.connect("accept-go");
      socket.on("open", () => {
         console.info("connect op", socket.peer);
      });
   });
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
   connect.on("auth", (data)=>console.info("auth", data));
   connect.connect(
      info.hostname,
      80,
      {
         host: "accept-go",
         port: 0,
         protocol: "http",
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
         console.info("get res log", chunk.length, chunk.slice(0, 256).toString());
         socket.destroy();
      },
   );
}

(async () => {
   //await createServer();
   await test();
})();
