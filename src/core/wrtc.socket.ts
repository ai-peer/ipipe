import net from "net";
import { SerialSocket } from "@ai-lion/ipeer";
import { Writable, Transform } from "stream";
import EventEmitter from "eventemitter3";

export type WrtcSocketEvent = {};

export default class WrtcSocket extends net.Socket {
   //private writerstream: WStream;
   constructor(readonly socket: SerialSocket) {
      super();
      this.init();
   }
   private init() {
      this.setAttr("remoteAddress", this.socket.peer);
      this.setAttr("remotePort", 0);
      this.setAttr("remoteFamily", "wrtc");

      this.socket.on("close", () => {
         this.setAttr("readyState", "closed");
         this.emit("close");
      });
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
   removeAllListeners(name: any) {
      this.socket.removeAllListeners(name);
      return this;
   }
   removeListener(name: any, handle: any) {
      this.socket.removeListener(name, handle);
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
            pid && clearTimeout(pid);
            resolve(data);
         });
      });
   }
   write(str: Uint8Array | string | Buffer, encoding: any, cb?: (err?: Error) => void): boolean {
      cb = typeof encoding === "function" ? encoding : cb;
      //console.info("write=========xxx", this.socket.open);
      this.socket.write(str, true);
      cb && cb(undefined);
      return true;
   }
   end(err: any) {
      if (this.socket.open) {
         this.socket.end(err);
      }
      return this;
   }
   /*  new Transform({
        transform(chunk, encoding, cb) {
           callback(chunk, encoding, cb);
        },
     } */
   pipe(destination: any, options?: { end?: boolean }): any {
      return new Trans(this.socket);
   }
   private setAttr(key: string, value: any) {
      Object.defineProperty(this, key, {
         value: value,
         //writable: false,
         enumerable: false,
         //configurable: false,
      });
   }
   destroy(err?: Error | undefined) {
      this.socket.destroy(err);
      return this;
   }
}
class Trans extends Transform {
   constructor(readonly socket: SerialSocket) {
      super();
      /*       this.socket.on("data", (chunk) => {
         this._transform(chunk, "utf-8", (err: Error | undefined, chunk) => {
            if (!err) this.push(chunk);
         });
      }); */
   }
   _write(chunk) {
      this.socket.write(chunk, true);
   }
   async _read() {
      let chunk = await this.socket.read(2 * 1000);
      if (chunk && chunk.byteLength > 0) {
         this._transform(chunk, "utf-8", (err: Error | undefined, chunk) => {
            if (!err) this.push(chunk);
         });
      }
      return chunk;
   }
   _transform(chunk: any, encoding: BufferEncoding, callback?) {
      //console.info("----transform", chunk.byteLength, encoding);
      callback && callback(undefined, chunk);
   }
}
