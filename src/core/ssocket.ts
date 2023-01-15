import net from "net";
import Cipher from "./cipher";
import transform from "../core/transform";
import Stream from "./stream";
import logger from "./logger";
import Sessions from "./sessions";
/**
 * 安全连接
 */
export default class SSocket {
   public socket: net.Socket;
   public cipher: Cipher | undefined;
   private face: number = 99;
   private stream = new Stream();

   constructor(socket: net.Socket, cipher?: Cipher, face: number = 99) {
      this.socket = socket;
      this.cipher = cipher;
      this.face = face;
      socket.setMaxListeners(99);
   }
   private getSession(socket: net.Socket) {
      return Sessions.instance.getSession(socket);
   }
   set protocol(protocol: string) {
      this.stream.protocol = protocol;
   }
   get protocol() {
      return this.stream.protocol;
   }
   get remoteAddress(): string {
      return this.socket.remoteAddress || "";
   }
   get destroyed() {
      return this.socket.destroyed;
   }
   async destroy(err?: Error) {
      if (err) {
         logger.debug(err);
         await this.end(err.message).catch((err) => {});
      }
      this.socket.destroy();
   }
   setTimeout(ttl: number = 0) {
      this.socket.setTimeout(ttl);
   }
   on(name: string, listener: (...args: any[]) => void) {
      if (name == "read") {
         /*  this.socket.on("data", (chunk) => {
            listener({ size: chunk.byteLength, socket: this.socket, protocol: this.protocol || "" });
         }); */
         this.stream.on(name, listener);
      } else if (name == "write") {
         this.stream.on(name, listener);
      } else if (name == "data") {
         this.socket.on(name, (chunk: Buffer) => {
            chunk = this.decode(chunk);
            listener(chunk);
         });
      } else {
         this.socket.on(name, listener);
      }
   }
   async write(chunk: Buffer | string): Promise<void> {
      //console.info("write1",!!this.cipher, [...chunk], chunk.toString());
      /*       if (this.cipher) {
         chunk = this.cipher.encode(chunk instanceof Buffer ? chunk : Buffer.from(chunk), this.face);
      } */
      chunk = this.encode(chunk instanceof Buffer ? chunk : Buffer.from(chunk));
      await this.stream.write(this.socket, chunk);
   }
   async end(chunk?: Buffer | string): Promise<void> {
      /*    if (this.cipher) {
         chunk = this.cipher.encode(chunk instanceof Buffer ? chunk : Buffer.from(chunk), this.face);
      } */
      if (chunk) {
         chunk = this.encode(chunk instanceof Buffer ? chunk : Buffer.from(chunk));
         await this.stream.end(this.socket, chunk);
      } else {
         await this.stream.end(this.socket, Buffer.from([]));
      }
   }
   async read(timeout: number = 0): Promise<Buffer> {
      let chunk = await this.stream.read(this.socket, timeout);
      /*     if (this.cipher) {
         chunk = this.cipher.decode(chunk, this.face);
      } */
      chunk = this.decode(chunk);
      return chunk;
   }
   encode(chunk: Buffer): Buffer {
      if (this.cipher) {
         return this.cipher.encode(chunk, this.face);
      } else {
         return chunk;
      }
   }
   decode(chunk: Buffer): Buffer {
      if (this.cipher) {
         return this.cipher.decode(chunk, this.face);
      } else {
         return chunk;
      }
   }
   /**
    *
    * @param target 目标
    * @param inputPipes 输入转换组
    * @param outputPipes 输出转换组
    */
   pipe(target: SSocket): SSocket {
      this.socket
         .pipe(
            transform((chunk: Buffer, encoding, callback) => {
               if (this.cipher) {
                  chunk = this.decode(chunk);
               }
               if (!!target.cipher) {
                  // chunk = target.cipher.encode(chunk, target.face);
                  chunk = target.encode(chunk);
               }
               this.stream.emit("read", {
                  chunk,
                  size: chunk.byteLength,
                  session: this.getSession(this.socket),
                  clientIp: this.socket.remoteAddress || "",
                  protocol: this.protocol || "",
               });
               target.stream.emit("write", {
                  chunk,
                  size: chunk.byteLength,
                  session: this.getSession(target.socket),
                  clientIp: target.socket.remoteAddress || "",
                  protocol: target.protocol || "",
               });
               callback(null, chunk);
            }),
         )
         .pipe(target.socket);
      return target;
      /* this.socket
         .pipe(
            transform((chunk: Buffer, encoding, callback) => {
               if (this.cipher) {
                  chunk = this.cipher.decode(chunk, this.face);
               }
               // this.emit("write", { size: chunk.length, socket: this.socket });
               callback(null, chunk);
            }),
         )
         .pipe(inputPipe)
         .pipe(target)
         .pipe(
            transform((chunk: Buffer, encoding, callback) => {
               //this.emit("write", { size: chunk.length, socket: this.socket });
               if (this.cipher) {
                  chunk = this.cipher.encode(chunk, this.face);
               }
               callback(null, chunk);
            }),
         )
         .pipe(outputPipe)
         .pipe(this.socket);*/
   }
}
