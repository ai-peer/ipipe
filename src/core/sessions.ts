import net from "net";
import { customAlphabet } from "nanoid";
const nanoid = customAlphabet("1234567890abcdefghijklmnopqrstwuvxyzABCDEFGHIJKLMNOPQRSTWUVXYZ", 7);

class Sessions {
   private static instances: Sessions;
   private pool: Map<net.Socket, string> = new Map();
   add(socket: net.Socket, session?: string) {
      if (this.pool.has(socket)) return;
      socket.once("close", () => this.pool.delete(socket));
      session = session || "rand-" + nanoid();
      this.pool.set(socket, session);
   }
   getSession(socket: net.Socket) {
      return this.pool.get(socket) || "";
   }

   /*  static getInstance() {
      if (!Sessions.instances) Sessions.instances = new Sessions();
      return Sessions.instances;
   } */
   static get instance() {
      if (!Sessions.instances) Sessions.instances = new Sessions();
      return Sessions.instances;
   }
}

export default Sessions;
