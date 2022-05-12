import net from "net";
import Cipher from "./cipher";
import Stream from "./stream";
import { Transform } from "stream";
import transform from "../core/transform";
import EventEmitter from "events";

const stream = new Stream();
/**
 * 安全连接
 */
export default class SSocket {
   public socket: net.Socket;
   public cipher: Cipher | undefined;
   public face: number = 99;
   constructor(socket: net.Socket, cipher?: Cipher, face: number = 99) {
      this.socket = socket;
      this.cipher = cipher;
      this.face = face;
   }
   get remoteAddress() {
      return this.socket.remoteAddress || "";
   }
   destroy(err?: Error | undefined) {
      this.socket.destroy(err);
   }
   on(name: string, handle: Function) {
      this.on(name, handle);
   }
   async write(chunk: Buffer): Promise<void> {
      if (this.cipher) {
         chunk = this.cipher.encode(chunk, this.face);
      }

      await stream.write(this.socket, chunk);
   }
   async end(chunk: Buffer): Promise<void> {
      if (this.cipher) {
         chunk = this.cipher.encode(chunk, this.face);
      }
      await stream.end(this.socket, chunk);
   }
   async read(timeout: number = 500): Promise<Buffer> {
      let chunk = await stream.read(this.socket, timeout);
      if (this.cipher) {
         chunk = this.cipher.decode(chunk, this.face);
      }
      return chunk;
   }
   transform() {
      return transform((chunk: Buffer, encoding, callback) => {
         if (this.cipher) {
            chunk = this.cipher.encode(chunk, this.face);
         }
         // this.emit("write", { size: chunk.length, socket: this.socket });
         callback(null, chunk);
      }).pipe(this.socket);
   }
   pipe(pipe: Transform) {
      return this.socket
         .pipe(
            transform((chunk: Buffer, encoding, callback) => {
               if (this.cipher) {
                  chunk = this.cipher.decode(chunk, this.face);
               }
               // this.emit("write", { size: chunk.length, socket: this.socket });
               callback(null, chunk);
            }),
         )
         .pipe(pipe);
      /*        .pipe(
            transform((chunk: Buffer, encoding, callback) => {
               //this.emit("write", { size: chunk.length, socket: this.socket });
               if (this.cipher) {
                  chunk = this.cipher.encode(chunk, this.face);
               }
               callback(null, chunk);
            }),
         )
         .pipe(this.socket); */
   }
}
