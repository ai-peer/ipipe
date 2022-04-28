import net from "net";
import { EventEmitter } from "events";

//export type Callback = (length: number) => void;

export default abstract class Stream extends EventEmitter {
   /**
    * 往网络里写数据
    * @param socket 网络连接socket
    * @param chunk 数据
    * @param callback 写完之后回调,并告知写子多少内容, (chunkSize: number)=>{}
    */
   public async write(socket: net.Socket, chunk: Buffer): Promise<Error | undefined> {
      return new Promise((resolve) => {
         socket.pause();
         setTimeout(() => {
            socket.write(chunk, function (err) {
               socket.resume();
               err ? resolve(err) : resolve(undefined);
               //chunk?.length > 0 && callback && callback(chunk.length);
            });
         }, 5);
      });
   }
   public async end(socket: net.Socket, chunk: Buffer): Promise<Error | undefined> {
      return new Promise((resolve) => {
         socket.pause();
         setTimeout(() => {
            socket.end(chunk, () => {
               socket.resume();
               //chunk?.length > 0 && callback && callback(chunk.length);
               resolve(undefined);
            });
         }, 5);
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
         socket.once("data", (ss) => {
            if (isRead) return;
            isRead = true;
            pid && clearTimeout(pid);
            resolve(ss);
            //ss?.length > 0 && callback && callback(ss.length);
            //callback && callback(ss?.length || 0);
         });
      });
   }
}
