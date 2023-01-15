import { Command } from "commander";
import IPipe from "../src";
import LightAccept from "../src/accept/light.accept";
import LightConnect from "../src/connect/light.connect";
import SSocket from "../src/core/ssocket";

const program = new Command();
let appParams: any = program //
   .option("-m, --mode [value]", "模式 server, client", "server") //
   .parse(process.argv)
   .opts();

async function createServer() {
   let ipipe = new IPipe({
      isDirect: true,
      auth: async (data) => {
         console.info("event log auth accept function check user==========>", data);
         return data.username == "admin" && data.password == "123";
      },
   });
   await ipipe.createAcceptServer(4321);
   ipipe.registerAccept(new LightAccept());
   ipipe.on("auth", (data) => console.info("event log auth", data));
   ipipe.on("accept", (data) => console.info("event log accept", data.protocol));
   ipipe.on("request", (data) => console.info("event log request", data));
   ipipe.on("in", (data) => console.info("event log in", data));
   ipipe.on("out", (data) => console.info("event log out", data));
}

async function createClient() {
   //let ipipe = new IPipe({});
   //ipipe.createAcceptServer(4321);
   let connect = new LightConnect();
   /*    connect.proxy = {
      host: "127.0.0.1",
      port: 4321,
      protocol: "light",
      username: "admin",
      password: "123",
   }; */
   connect.on("auth", (data) => {
      console.info("event log auth connect ==>", data);
   });
   const info = new URL("http://icanhazip.com");
   connect.connect(
      info.hostname,
      80,
      {
         host: "127.0.0.1",
         port: 4321,
         protocol: "light",
         username: "admin",
         password: "123",
      },
      async (err, socket: SSocket) => {
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
         let chunk = await socket.read();
         console.info("get res log", chunk.length, chunk.slice(0, 1024).toString());
         socket.destroy();
      },
   );
}

(async () => {
   /*    if (appParams.mode == "client") {
      createClient();
   } else {
      createServer();
   } */
   await createServer();
   createClient();
})();
