import IPipe, { WrtcAccept, WrtcConnect, SSocket, password, Cipher } from "../src";
import XPeer from "../src/core/xpeer";
import fetch from "../src/utils/fetch";
import fs from "fs";
const passwordSecret =
   "g35S152AORUWePWZjezQ8UVZXV5nbTxCkW87ZU+L6gVULjFTL+MP8vgJjBnvhwZM3f0HRhxAECVEWjOjjvuo0SIsV6nZcdQTNHJL/nVb4u2r3qLLSdXIF8A1iipDevmbhYTWrGinuJ7P8xvNJFDwlz9VPQA3zEEDEh8RDSlff6+GpcKcXLtuiWTT0oLkGpS+9ms+abeBv2H8SFafsK7EyfR0DCAtfL2qjxR94bzaYpAeOMGWC2pYumN36+6gyk5NZv8YxukmBArgrWwd36EBCA6kx9sjYLM2JzDOK5XmsXkCe9zlmMW12IhzUej693C0MiG2pnbDsjqSSii5R5qT5w==";
const cipherPassword = Cipher.createCipher(passwordSecret);

console.info("new sec", password.generateRandomPassword());
process.on("uncaughtException", (err) => {});
process.on("unhandledRejection", (err) => {});
type Proxy = { peer: string; username: string; password: string; ip: string; country: string };
const proxyList: Proxy[] = [];
async function getProxys(): Promise<Proxy[]> {
   if (proxyList.length > 0) return proxyList.sort((a, b) => (Math.floor(Math.random() * 2) == 0 ? -1 : 1));
   let list = await fetch({ url: "https://p0.iee.one/api/client/res/xxx?apikey=ivideos&hasIp=true" }) //
      .then((res) => res.json())
      .then((res) => res.data?.list || []);
   list = list
      .map((v) => {
         return {
            peer: v.id,
            username: v.username,
            ip: v.id4,
            country: v.country,
            password: cipherPassword.decode(Buffer.from(v.password, "base64"), v.cf).toString(),
         };
      })
      .filter((v) => /^[a-z0-9]+$/.test(v.password));
   proxyList.push(...list);
   //console.info("list", list.map((v) => v.peer + ":" + v.username + ":" + v.password+":"+v.ip).join("\r\n"));
   return list;
}
async function createServer() {
   const ipipe = new IPipe({
      peerId: "accept-goxxx",
      isDirect: false,
   });
   //ipeer.registerAccept(new WrtcAccept());
   let list = await getProxys();
   list.forEach((p) => {
      ipipe.registerProxy({
         protocol: "wrtc",
         host: p.peer,
         port: 0,
         username: p.username,
         password: p.password,
      });
   });
   /*    ipipe.registerProxy({
      protocol: "wrtc",
      host: "414522daa2e5b3a22477f032f949d731",
      port: 0,
      username: "2DOlUv4R",
      password: "F7wwnWXF",
   }); */
   ipipe.on("auth", (data) => {
      if (data.checked) {
         //console.info("event log auth", data.checked, data.type);
      } else {
         console.info("event log auth", data);
      }
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
         /* auth: {
            username: "admin",
            password: "123",
         }, */
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
   const info = new URL("https://ifconfig.me/ip"); //https://cdn3.sydwzpks.com:4433/duoda/2736/index051.ts

   const connect = new WrtcConnect();
   let startTime = Date.now();
   connect.on("error", (err) => console.info("error====", err.message));
   connect.on("close", () => console.info("close"));
   connect.on("auth", (data) => data.checked || console.info("event log auth", data));
   connect.on("timeout", () => console.info("event log timeout"));
   let list = await getProxys();
   //ca86dbe3b547bd1783154614de9968cb:14de9968:17831546
   /*    let proxy = {
      peer: "b9e23bc8aee6224af2bf92f90c4c495b",
      username: "f90c4c49",
      password: "4af2bf92",
   }; */
   let proxy = list[0];
   console.info("user proxy", proxy.country + ":" + proxy.ip + "@" + proxy.username + ":" + proxy.password);
   return new Promise(async (resolve) => {
      connect.connect(
         info.hostname,
         80,
         {
            protocol: "wrtc",
            host: proxy.peer,
            port: 0,
            username: proxy.username,
            password: proxy.password,
         },
         async (err, socket: SSocket) => {
            if (err) {
               console.info("connect error==", err["message"] || err.toString() || "");
               resolve(Buffer.alloc(0));
               return;
            }
            console.info("connect ttl", Date.now() - startTime);
            let list: string[] = [
               `GET ${info.href} HTTP/1.1`,
               "accept: application/json, text/plain, */*",
               "user-Agent: axios/0.25.0",
               `host: ${info.hostname}`,
               "connection: close",
               "\r\n",
            ];

            let count = 0;
            let isFirst = true;
            let outData: Buffer[] = [];
            socket.on("data", (data) => {
               if (data.byteLength <= 1) return;
               count += data.byteLength;
               //console.info("receive ", Date.now(), data.length, data.toString());
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
               console.info("content-length", count, outxx.byteLength, outxx.toString());
               resolve(out);
            });
            //console.info("req", list.join("\r\n"));
            await socket.write(list.join("\r\n"));
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
   new XPeer();
   await wait(200);
   //await createServer();
   /*    for (let i = 0; i < 1; i++) {
      await test1(i + 1);
      await wait(1 * 1000);
   } */
   //await testWebSocket();
   for (let i = 0; i < 6; i++) {
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
