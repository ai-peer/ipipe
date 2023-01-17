import net from "net";
import EventEmitter from "eventemitter3";
import { AuthData, WriteData, ReadData, ConnectUser } from "../types";
import Sessions from "./sessions";
import SSocket from './ssocket';

//export type Callback = (length: number) => void;
export type StreamEvent = {
   open: () => void;
   /**
    * 读取事件
    * @param
    *    data: {
    *       size: 数据大小
    *       session: session
    *       clientIp: 客户端ip
    *       protocol: 协议
    *    }
    * @returns void
    */
   read: (data: ReadData) => void;
   /**
    * 写入事件
    * @param
    *    data: {
    *       size: 数据大小
    *       session: session
    *       clientIp: 客户端ip
    *       protocol: 协议
    *    }
    * @returns void
    */
   write: (data: WriteData) => void;
   /**
    * 验证事件
    *
    */
   auth: (data: AuthData) => void;

   close: (socket: net.Socket) => void;

   error: (err: Error) => void;

   timeout: () => void;
   heartbeat: (ssocket: SSocket) => void;
};
export default class Stream extends EventEmitter<StreamEvent> {
   protected sessions: Sessions = Sessions.instance;
   public protocol: string;
   constructor() {
      super();
      //this.setMaxListeners(99);
   }
   protected getSession(socket: net.Socket) {
      return this.sessions.getSession(socket);
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
         socket.writable &&
            socket.write(chunk, (err) => {
               socket.resume();
               if (err) {
                  resolve(err);
               } else {
                  this.emit("write", { chunk, size: chunk.length, session: this.getSession(socket), protocol: this.protocol || "", clientIp: socket.remoteAddress || "" });
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
         socket.writable
            ? socket.end(chunk, () => {
                 socket.resume();
                 this.emit("write", { chunk, size: chunk.length, session: this.getSession(socket), clientIp: socket.remoteAddress || "", protocol: this.protocol || "" });
                 resolve(undefined);
              })
            : socket.end();
         //}, 5);
      });
   }
   public async read(socket: net.Socket, ttl: number = 0): Promise<Buffer> {
      let _this = this;
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
               socket.removeListener("data", handle);
               if (isRead) return;
               isRead = true;
               resolve(Buffer.alloc(0));
            }, ttl);
         }
         function handle(chunk: Buffer) {
            socket.removeListener("data", handle);
            pid && clearTimeout(pid);
            if (isRead) return;
            isRead = true;
            _this.emit("read", { chunk, size: chunk.length, session: _this.getSession(socket), clientIp: socket.remoteAddress || "", protocol: this.protocol || "" });
            resolve(chunk);
         }
         socket.once("data", handle);
      });
   }
}
