import { Socket } from "net";

/**
 * socket 多路复用技术, 减少重新连接的网络开销,提升性能
 */
export class Multiplexing {
   private pool: Map<string, Socket[]> = new Map();

   constructor() {}
   key(host: string, port: string | number) {
      port = port || "";
      if (port) {
         return host + ":" + port;
      }
      return host;
   }
   add(socket: Socket) {
      let key = this.key(socket.remoteAddress || "", socket.remotePort || "");
      let list = this.pool.get(key) || [];
      if (list.length > 10 || list.includes(socket)) {
         return socket.destroy(new Error("max"));
      }
      console.info("add socket",key, socket.remoteAddress, socket.remotePort, this.pool.size, list.length);

      socket.once("close", () => {
         let list = this.pool.get(key) || [];
         let idx = list.findIndex((v) => v == socket);
         list.splice(idx, 1);
         console.info("del multi");
         this.clear(socket);
      });

      list.push(socket);
      this.pool.set(key, list);
   }
   get(host: string, port: number | string): Socket | undefined {
      let key = this.key(host, port);
      let list = this.pool.get(key) || [];

      let socket = list.splice(0, 1)[0];
      if (socket) this.clear(socket);
      console.info("get socket", key, [...this.pool.keys()], !!socket, list?.length, this.pool.size);
      return socket;
   }
   private clear(socket: Socket) {
      socket.removeAllListeners("data");
      socket.removeAllListeners("close");
      socket.removeAllListeners("error");
      socket.removeAllListeners("timeout");
      socket.removeAllListeners("drain");
      socket.removeAllListeners("connect");
      socket.removeAllListeners("end");
      socket.removeAllListeners("lookup");
      socket.removeAllListeners("ready");
   }
}
const multi = new Multiplexing();
export default multi;
