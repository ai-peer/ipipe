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
   private checkPid;
   constructor() {
      this.check();
   }
   /**
    * 定期检测连接
    * @param timeout 周期时间, 默认10分钟,单位毫秒
    */
   check(timeout: number = 30 * 60 * 1000) {
      this.checkPid && clearInterval(this.checkPid);
      this.checkPid = setInterval(() => {
         this.pool.forEach((list, key) => {
            for (let i = list.length - 1; i >= 0; i--) {
               try {
                  let xs = list[i];
                  if (xs.start + timeout < Date.now()) {
                     list.splice(i, 1);
                     xs.socket.destroy();
                  }
               } catch (err) {}
            }
         });
      }, 60 * 1000);
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
      if (list.length > 48) {
         socket.destroy();
         return;
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
      while (true) {
         if (list.length < 1) return;
         let xs = list.splice(0, 1)[0];
         if (!xs.socket.destroyed) return xs.socket;
      }
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
