import net from "net";
import Connect, { Callback } from "./connect";

/**
 * 直接连接
 */
export default class DirectConnect extends Connect {
   constructor() {
      super({
         protocol: "direct",
      });
   }

   public async connect(host: string, port: number, callback: Callback): Promise<net.Socket> {
      return new Promise((resolve, reject) => {
         let socket = net.connect(port, host, () => {
            callback(undefined, socket);
            resolve(socket);
         });
         socket.on("error", (err) => {
            socket.destroy(err);
            callback(err, socket);
         });
      });
   }
}
