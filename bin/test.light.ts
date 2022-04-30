import { Command } from "commander";
import IPipe from "../src";
import LightAccept from "../src/accept/light.accept";
import LightConnect from "../src/connect/light.connect";
import Stream from "../src/core/stream";
import net from "net";

const tstream = new Stream();

const program = new Command();
let appParams: any = program //
   .option("-m, --mode [value]", "模式 server, client", "server") //
   .parse(process.argv)
   .opts();

async function createServer() {
   let ipipe = new IPipe({
      isDirect: true,
      auth: async (username, password) => {
         console.info("check user", username, password);
         return username == "admin" && password == "123";
      },
   });
   ipipe.createAcceptServer(4321);
   ipipe.registerAccept(new LightAccept());
}

async function createClient() {
   let ipipe = new IPipe({});
   //ipipe.createAcceptServer(4321);
   let connect = new LightConnect({});
   connect.proxy = {
      host: "127.0.0.1",
      port: 4321,
      protocol: "light",
      username: "admin",
      password: "123",
   };
   
   connect.connect("127.0.0.1", 4321, async (err, socket: net.Socket) => {
      console.info("sss===connect");
      let list: string[] = [
         "GET http://ip-api.com/json HTTP/1.1",
         "Accept: application/json, text/plain, */*",
         "User-Agent: axios/0.25.0",
         "host: ip-api.com",
         "Connection: close",
         "\r\n",
      ];
      await tstream.write(socket, list.join("\r\n"));
      let chunk = await tstream.read(socket);
      console.info("chunk", chunk.toString());
      socket.destroy();
   });
}

(async () => {
   if (appParams.mode == "client") {
      createClient();
   } else {
      createServer();
   }
})();
