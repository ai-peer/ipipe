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
         setTimeout(() => {
            _this.pool.delete(key);
         }, 1000);
      });
      session = session || "rand-" + nanoid();
      this.pool.set(key, session);
   }
   getSession(socket: net.Socket) {
      let key = this.getKey(socket);
      //console.info("get session", key, this.pool.has(key));
      return this.pool.get(key) || "";
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
