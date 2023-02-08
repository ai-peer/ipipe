import IPipe, { WrtcAccept, WrtcConnect, SSocket } from "../src";
import XPeer from "../src/core/xpeer";
import fetch from "../src/utils/fetch";
import fs from "fs";
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
      host: "414522daa2e5b3a22477f032f949d731",
      port: 0,
      username: "2DOlUv4R",
      password: "F7wwnWXF",
   });
   ipipe.on("auth", (data) => {
      /*    if (data.checked) {
         console.info("event log auth", data.checked, data.type);
      } else {
         console.info("event log auth", data);
      } */
   });
   ipipe.on("request", (data) => console.info("event log request", data.status, data.host, data.ttl));
   ipipe.on("error", (err) => console.info("event log error", err.message));
   //ipipe.on("accept", (data) => console.info("event log accept", data.protocol));
   await ipipe.createAcceptServer(1082, "0.0.0.0", (id) => {
      console.info("create server", id);
   });
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
async function test1(count = 0) {
   console.info("log fetch=================", count);
   let startTime = Date.now();
   let res = await fetch({
      url: "http://ifconfig.me/ip",
      timeout: 30 * 1000,
      proxy: {
         host: "127.0.0.1",
         port: 1082,
         auth: {
            username: "admin",
            password: "123",
         },
      },
   }).catch((err) => {
      return {
         status: 500,
         text: () => err.message || "",
      };
   });
   let text = (await res.text()) || "";
   console.info("log res===", res.status, text.length, text, "ttl=" + (Date.now() - startTime));
}
async function test() {
   new XPeer();
   const info = new URL("https://www.qq.com/"); //https://cdn3.sydwzpks.com:4433/duoda/2736/index051.ts

   const connect = new WrtcConnect();
   let startTime = Date.now();
   connect.on("error", () => {});
   connect.once("close", () => console.info("close"));
   // connect.on("auth", (data) => console.info("auth", data));
   return new Promise(async (resolve) => {
      connect.connect(
         info.hostname,
         80,
         {
            protocol: "wrtc",
            host: "924c67c05e2271ad3fb91a1f8a7ebebc",
            port: 0,
            username: "3ptDx1gf",
            password: "1EgKHIfR",
         },
         async (err, socket: SSocket) => {
            console.info("connect ttl", Date.now() - startTime);
            let list: string[] = [
               `GET ${info.href} HTTP/1.1`,
               "Accept: application/json, text/plain, */*",
               "User-Agent: axios/0.25.0",
               `host: ${info.hostname}`,
               "Connection: close",
               "\r\n",
               //`{"mid": "fa96b01a8a21adc6955c5f6a10ec84d5"}`
            ];
            //await tstream.write(socket, list.join("\r\n"));
            //console.info("send xx", list.join("\r\n"));

            let count = 0;
            let isFirst = true;
            let outData: Buffer[] = [];
            socket.on("data", (data) => {
               if (data.byteLength <= 1) return;
               count += data.byteLength;
               //console.info("chunk size=", data.length);
               outData.push(data);
            });
            socket.once("close", () => {
               //console.info("close all size =", count);
               let out = Buffer.concat(outData);
               let endIdx =
                  out.findIndex((v, i) => {
                     return (
                        String.fromCharCode(v) == "\r" &&
                        String.fromCharCode(out[i + 1]) == "\n" && //
                        String.fromCharCode(out[i + 2]) == "\r" &&
                        String.fromCharCode(out[i + 3]) == "\n"
                     );
                  }) + 4;
               let outxx = out.slice(endIdx);
               console.info("content-length", count, outxx.byteLength);
               resolve(undefined);
            });

            await socket.write(list.join("\r\n"));
            //socket.write(`{"mid": "fa96b01a8a21adc6955c5f6a10ec84d5"}`);

            //let chunk = await tstream.read(socket);
            //let w = fs.createWriteStream("/a.ts");

            //let chunk = await socket.read(15 * 1000);
            //console.info("get res log", chunk.length, chunk.slice(0, 1024).toString());
            //socket.destroy();
         },
      );
   });
}

async function test2() {
   new XPeer();
   const info = new URL("http://ifconfig.me/ip"); //https://cdn3.sydwzpks.com:4433/duoda/2736/index051.ts

   const connect = new WrtcConnect();
   let startTime = Date.now();
   connect.on("error", () => {});
   connect.once("close", () => console.info("close"));
   connect.on("auth", (data) => console.info("auth", data));
   connect.connect(
      info.hostname,
      80,
      {
         protocol: "wrtc",
         host: "x-server1",
         port: 0,
         username: "admin",
         password: "123456",
      },
      async (err, socket: SSocket) => {
         console.info("connect ttl", Date.now() - startTime);
         let list: string[] = [
            `GET ${info.href} HTTP/1.1`,
            "Accept: application/json, text/plain, */*",
            "User-Agent: axios/0.25.0",
            `host: ${info.hostname}`,
            "Connection: close",
            "\r\n",
            //`{"mid": "fa96b01a8a21adc6955c5f6a10ec84d5"}`
         ];
         //await tstream.write(socket, list.join("\r\n"));
         console.info("send xx", list.join("\r\n"));

         let count = 0;
         let isFirst = true;
         let s = "";
         socket.on("data", (data) => {
            if (data.byteLength <= 1) return;
            count += data.byteLength;
            s += data.toString();
            console.info("chunk size=", data.length);
         });
         socket.on("close", () => {
            console.info("close all size =", count, s);
         });

         await socket.write(list.join("\r\n"));
         //socket.write(`{"mid": "fa96b01a8a21adc6955c5f6a10ec84d5"}`);

         //let chunk = await tstream.read(socket);
         //let w = fs.createWriteStream("/a.ts");

         //let chunk = await socket.read(15 * 1000);
         //console.info("get res log", chunk.length, chunk.slice(0, 1024).toString());
         //socket.destroy();
      },
   );
}
async function testWebSocket() {
   new XPeer();
   const info = new URL("wss://p0.iee.one/peerjs?key=peerjs&username=admin&password=123456&id=x-server2&token=c81gqwjsk6&version=1.4.6");

   const connect = new WrtcConnect();
   let startTime = Date.now();
   connect.on("error", () => {});
   connect.once("close", () => console.info("close"));
   connect.on("auth", (data) => console.info("auth", data));
   connect.connect(
      info.hostname,
      80,
      {
         host: "x-server1",
         port: 0,
         protocol: "wrtc",
         username: "admin",
         password: "123456",
      },
      async (err, socket: SSocket) => {
         console.info("connect ttl", Date.now() - startTime);
         let list: string[] = [
            `GET ${info.href} HTTP/1.1`,
            "Accept: application/json, text/plain, */*",
            "User-Agent: axios/0.25.0",
            `host: ${info.hostname}`,
            `upgrade: websocket`,
            "connection: Upgrade",
            "\r\n",
            //`{"mid": "fa96b01a8a21adc6955c5f6a10ec84d5"}`
         ];
         //await tstream.write(socket, list.join("\r\n"));

         await socket.write(list.join("\r\n"));

         //let chunk = await tstream.read(socket);
         socket.on("data", (data) => {
            console.info("data", [...data], data.toString());
         });

         for (let i = 0; i < 13; i++) {
            await socket.write(`{"type":"HEARTBEAT"}`);
            await wait(3000);
         }
      },
   );
}

(async () => {
   await createServer();
   /*    for (let i = 0; i < 1; i++) {
      await test1(i + 1);
      await wait(1 * 1000);
   } */
   //await testWebSocket();
   for (let i = 0; i < 3; i++) {
      let st = Date.now();
      await test();
      console.info("req ttl", Date.now() - st);
   }
   console.info("===========edd============");

   // process.exit(0);
})();
async function wait(ttl) {
   return new Promise((resolve) => {
      setTimeout(() => resolve(undefined), ttl);
   });
}
