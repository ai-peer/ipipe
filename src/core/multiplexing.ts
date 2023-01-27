import SSocket from "./ssocket";

/**
 * socket 多路复用技术, 减少重新连接的网络开销,提升性能
 */
export class Multiplexing {
   private pool: Map<string, SSocket[]> = new Map();

   constructor() {}
   key(host: string, port: string | number) {
      port = port || "";
      if (port) {
         return host + ":" + port;
      }
      return host;
   }
   add(socket: SSocket) {
      //if (socket.protocol == "direct") return;
      if(socket.protocol != "wrtc") return;
      let key = this.key(socket.remoteAddress || "", socket.remotePort || "");
      let list = this.pool.get(key) || [];

      if (!!list.find((v) => v.id == socket.id)) return;

      /** */
      if (list.length > 20) {
         return socket.destroy();
      }

      socket.once("close", (real) => {
         if (real) {
            let idx = list.findIndex((v) => v.id == socket.id);
            list.splice(idx, 1);
         }
      });

      list.push(socket);
      this.pool.set(key, list);
      //console.info("add socket", key, socket.id, socket.remoteAddress, socket.remotePort, this.pool.size, list.length);
   }
   get(host: string, port: number | string): SSocket | undefined {
      let key = this.key(host, port);
      let list = this.pool.get(key) || [];
      let socket = list.splice(0, 1)[0];
      //console.info("get socket", key, !!socket, socket?.id || "", list?.length, this.pool.size);
      return socket;
   }
   /*    private clear(socket: SSocket) {
      socket.removeAllListeners("data");
      socket.removeAllListeners("close");
      socket.removeAllListeners("error");
      socket.removeAllListeners("timeout");
      socket.removeAllListeners("drain");
      socket.removeAllListeners("connect");
      socket.removeAllListeners("end");
      socket.removeAllListeners("lookup");
      socket.removeAllListeners("ready");
   } */
}
const multi = new Multiplexing();
export default multi;
