import net from "net";
import { EventEmitter } from "events";

//export type Callback = (length: number) => void;

export default class Stream extends EventEmitter {
   public protocol: string;
   constructor() {
      super();
      this.setMaxListeners(99);
   }
   /**
    * 往网络里写数据
    * @param socket 网络连接socket
    * @param chunk 数据
    * @param callback 写完之后回调,并告知写子多少内容, (chunkSize: number)=>{}
    */
   public async write(socket: net.Socket, chunk: Buffer | string): Promise<Error | undefined> {
      return new Promise((resolve) => {
         socket.pause();
         //setTimeout(() => {
         socket.write(chunk, (err) => {
            socket.resume();
            if (err) {
               resolve(err);
            } else {
               this.emit("write", { size: chunk.length, socket: socket, protocol: this.protocol || "" });
               resolve(undefined);
            }
         });
         //}, 5);
      });
   }
   public async end(socket: net.Socket, chunk: Buffer | string): Promise<Error | undefined> {
      return new Promise((resolve) => {
         socket.pause();
         //setTimeout(() => {
         socket.writableEnded &&
            socket.end(chunk, () => {
               socket.resume();
               this.emit("write", { size: chunk.length, socket: socket, protocol: this.protocol || "" });
               resolve(undefined);
            });
         //}, 5);
      });
   }
   public async read(socket: net.Socket, ttl: number = 0): Promise<Buffer> {
      return new Promise((resolve) => {
         let isRead = false,
            pid;
         /*       socket.once("readable", () => {
      let ss = socket.read();
      resolve(ss);
      ss?.length > 0 && callback && callback(ss.length);
    }); */
         if (ttl > 0) {
            pid = setTimeout(() => {
               if (isRead) return;
               isRead = true;
               resolve(Buffer.alloc(0));
            }, ttl);
         }
         socket.once("data", (chunk: Buffer) => {
            pid && clearTimeout(pid);
            if (isRead) return;
            isRead = true;
            this.emit("read", { size: chunk.length, socket: socket, protocol: this.protocol || "" });
            resolve(chunk);
            //ss?.length > 0 && callback && callback(ss.length);
            //callback && callback(ss?.length || 0);
         });
      });
   }
}
