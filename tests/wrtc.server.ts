import IPipe, { WrtcAccept, WrtcConnect, SSocket } from "../src";
import net from "net";
import { Transform } from "stream";
process.on("uncaughtException", (err) => {});
process.on("unhandledRejection", (err) => {});
async function createServer() {
   const ipipe = new IPipe({
      peerId: "accept-go",
      isDirect: true,
      auth: async({username, password})=>{
         return username=="admin" && password == "123"
      }
   });
   //ipeer.registerAccept(new WrtcAccept());
   await ipipe.createAcceptServer(1072);
   ipipe.on("accept", (data) => console.info("event log accept", data.protocol));
    
   //let socket = new net.Socket();
   //socket.pipe(new Transform());
   /*    const ipeerAccept = new IPeer({});
   await ipeerAccept.createAcceptServer(1070);
   ipeerAccept.registerProxy({
      protocol: "wrtc",
      host: "accept-go",
      port: 0,
   }); */
}

(async () => {
   await createServer();
})();
