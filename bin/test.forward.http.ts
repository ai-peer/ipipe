import { Command } from "commander";
import IPipe from "../src";
import LightAccept from "../src/accept/light.accept";
import LightConnect from "../src/connect/light.connect";
import SSocket from "../src/core/ssocket";
import ForwardHttpConnect from "../src/connect/forward.http.connect";

const program = new Command();
let appParams: any = program //
   .option("-m, --mode [value]", "模式 server, client", "server") //
   .parse(process.argv)
   .opts();

const forwardPort = 4322,
   port = 4321;

async function createServer() {
   let ipipeTarget = new IPipe({
      isDirect: true,
      auth: async (data) => {
         //console.info("event log auth accept function check user target==========>", data);
         return data.username == "admin" && data.password == "123";
      },
   });
   await ipipeTarget.createAcceptServer(port);
   //ipipeTarget.registerAccept(new LightAccept());
   //ipipeTarget.on("auth", (data) => console.info("event log auth", data));
   /*   ipipeTarget.on("accept", (data) => console.info("event log accept", data.protocol));
   ipipeTarget.on("request", (data) => console.info("event log request", data));
   ipipeTarget.on("in", (data) => console.info("event log in", data));
   ipipeTarget.on("out", (data) => console.info("event log out", data)); */

   let ipipeForwardHttp = new IPipe({
      isDirect: true,
      auth: async (data) => {
         //console.info("event log auth accept function check user forward==========>", data);
         return data.username == "admin" && data.password == "123456";
      },
   });

   //ipipeForwardHttp.on("accept", (data) => console.info("event log accept forward.http", data.protocol));
   //ipipeForwardHttp.on("auth", (data) => console.info("event log auth forward.http", data));
   //ipipeForwardHttp.on("error", (err) => console.info("forwardhttp error forward.http", err));
   ipipeForwardHttp.on("in", (data) => console.info("event log forwardhttp in", data.size));
   ipipeForwardHttp.on("out", (data) => console.info("event log forwardhttp out", data.size));
   ipipeForwardHttp.on("error", (err)=>console.info("event log forwardhttp error", err));
   await ipipeForwardHttp.createAcceptServer(forwardPort);
}

async function createClient() {
   let connect = new ForwardHttpConnect();
   connect.on("auth", (data) => {
      //console.info("event log auth connect ==>", data);
   });
   const info = new URL("http://icanhazip.com");

   connect.connect(
      info.hostname,
      80,
      {
         host: "127.0.0.1",
         port: port,
         protocol: "http",
         username: "admin",
         password: "123",
         //forwardHost: "127.0.0.1",
         //forwardPort: forwardPort,
         forward: {
            host: "127.0.0.1",
            port: forwardPort,
            username: "admin",
            password: "123456",
         },
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
   await createServer();
   createClient();
})();
