import net from "net";
import { customAlphabet } from "nanoid";
const nanoid = customAlphabet("1234567890abcdefghijklmnopqrstwuvxyzABCDEFGHIJKLMNOPQRSTWUVXYZ", 7);

class Sessions {
   private static instances: Sessions = new Sessions();
   private pool: Map<string, string> = new Map();
   add(socket: net.Socket, session?: string) {
      let key = this.getKey(socket);
      if (this.pool.has(key)) return;
      let _this = this;
      socket.once("close", () => {
         _this.pool.delete(key);
      });
      session = session || `ts-${socket.localPort + ":" + (socket.remoteAddress || "") + ":" + socket.remotePort}`;
      this.pool.set(key, session);
   }
   getSession(socket: net.Socket) {
      let key = this.getKey(socket);
      return this.pool.get(key) || `ts-${socket.localPort + ":" + (socket.remoteAddress || "") + ":" + socket.remotePort}`;
   }

   /*  static getInstance() {
      if (!Sessions.instances) Sessions.instances = new Sessions();
      return Sessions.instances;
   } */
   static get instance() {
      //if (!Sessions.instances) Sessions.instances = new Sessions();
      return Sessions.instances;
   }
   private getKey(socket: net.Socket): string {
      let key = socket.remoteFamily + ":" + socket.remoteAddress + ":" + socket.remotePort;
      return key;
   }
}

export default Sessions;
