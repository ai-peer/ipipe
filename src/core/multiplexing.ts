import SSocket from "./ssocket";

type XS = {
   socket: SSocket;
   start: number;
};
/**
 * socket 多路复用技术, 减少重新连接的网络开销,提升性能
 */
export class Multiplexing {
   private pool: Map<string, XS[]> = new Map();

   constructor() {
      /*       setInterval(()=>{
         this.pool.forEach((vals, key)=>{
            console.info("key", key, vals.length);
         })
      }, 30 * 1000); */
      setInterval(() => {
         this.pool.forEach((list, key) => {
            for (let i = list.length - 1; i >= 0; i--) {
               let xs = list[i];
               if (xs.start + 60 * 1000 < Date.now()) {
                  list.splice(i, 1);
               }
            }
         });
      }, 30 * 1000);
   }
   key(host: string, port: string | number) {
      port = port || "";
      if (port) {
         return host + ":" + port;
      }
      return host;
   }
   add(socket: SSocket) {
      //if (socket.protocol == "direct") return;
      if (socket.type == "accept") return;
      if (socket.protocol != "wrtc") return;
      let key = this.key(socket.remoteAddress || "", socket.remotePort || "");
      let list = this.pool.get(key) || [];

      if (!!list.find((v) => v.socket.id == socket.id)) return;

      /** */
      if (list.length > 64) {
         return socket.destroy();
      }

      socket.once("close", (real) => {
         if (real) {
            let idx = list.findIndex((v) => v.socket.id == socket.id);
            list.splice(idx, 1);
         }
      });

      list.push({ socket, start: Date.now() });
      this.pool.set(key, list);
      //console.info("add socket", key, socket.id, socket.remoteAddress, socket.remotePort, this.pool.size, list.length);
   }
   get(host: string, port: number | string): SSocket | undefined {
      let key = this.key(host, port);
      let list = this.pool.get(key) || [];
      if (list.length < 1) return;
      let xs = list.splice(0, 1)[0];
      //console.info("get socket", key, !!socket, socket?.id || "", list?.length, this.pool.size);
      return xs?.socket;
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