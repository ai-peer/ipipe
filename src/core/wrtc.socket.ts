import net from "net";
import { SerialSocket } from "@ai-lion/ipeer";
import { Writable, Transform } from 'stream';
import EventEmitter from "eventemitter3";
  
export type WrtcSocketEvent = {};

export default class WrtcSocket extends net.Socket {
   //private writerstream: WStream;
   constructor(readonly socket: SerialSocket) {
      super();
      this.init();
   }
   private init() {
      /*       this.writerstream = new WStream(this.socket);
      this.socket.on("close", () => {
         this.setAttr("readyState", "closed");
         this.emit("close");
      });
      this.socket.on("error", (err) => this.emit("error", err));
    
      this.socket.on("timeout", () => this.emit("timeout")); */
      //this.writable = this.socket.open;
      //this.remoteFamily = this.socket.peer;
   }
   on(event: string, handle: any): this {
      switch (event) {
         case "data":
         case "close":
         case "error":
         case "timeout":
         case "iceStateChanged":
         case "open":
            this.socket.on(event, handle);
            break;
      }
      return this;
   }
   once(event: string, handle: any): this {
      switch (event) {
         case "data":
         case "close":
         case "error":
         case "timeout":
         case "iceStateChanged":
         case "open":
            this.socket.once(event, handle);
            break;
      }
      return this;
   }
   pause() {
      return this;
   }
   resume() {
      return this;
   }
   /* 
   get remoteAddress(): string {
      return this.socket.peer;
   }
   get remotePort(): number {
      return 0;
   }
   get localPort(): number {
      return 0;
   } */
   async read(ttl: number = 0): Promise<Buffer> {
      return new Promise((resolve) => {
         let pid = ttl > 0 ? setTimeout(() => resolve(Buffer.alloc(0)), ttl) : undefined;
         this.socket.once("data", (data) => {
            console.info("read=========", data);
            pid && clearTimeout(pid);
            resolve(data);
         });
      });
   }
   write(str: Uint8Array | string | Buffer, encoding: any, cb?: (err?: Error) => void): boolean {
      cb = typeof encoding === "function" ? encoding : cb;
      //console.info("write=========xxx", this.socket.open);
      this.socket.write(str);
      cb && cb(undefined);
      return true;
   }
   /*  new Transform({
        transform(chunk, encoding, cb) {
           callback(chunk, encoding, cb);
        },
     } */
   pipe(destination: any, options?: { end?: boolean }): any {
     // let ws = new WStream(this.socket);
      destination.on("data", (data) => {
         console.info("======", data.toString());
         this.socket.write(data)
      });
      destination.once("close", () => this.socket.destroy());
      let transform = new Transform({
         transform(chunk, encoding, cb) {
            //callback(chunk, encoding, cb);
            console.info("write==========>", chunk.toString());
            destination.write(chunk);
         },
      });
      return transform;
   }
   private setAttr(key: string, value: any) {
      Object.defineProperty(this, key, {
         value: value,
         //writable: false,
         enumerable: false,
         //configurable: false,
      });
   }
}
 