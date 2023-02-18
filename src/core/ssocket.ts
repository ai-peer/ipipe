import net from "net";
import Cipher from "./cipher";
import transform from "../core/transform";
import Stream from "./stream";
import logger from "./logger";
import Sessions from "./sessions";
import { CMD, ReadData, WriteData } from "../types";
import EventEmitter from "eventemitter3";
import multi from "./multiplexing";
import { buildSN } from "./password";

export type EventType = {
   connect: (ssocket: SSocket) => void;
   data: (chunk: Buffer) => void;
   /** 关闭事件
    *    @param real: 是否真实关闭
    *
    */
   close: (real: boolean) => void;
   error: (error: Error) => void;
   read: (data: ReadData) => void;
   write: (data: WriteData) => void;
   reset: (ssocket: SSocket) => void;
   /** 响应指令 */
   responseCMD: () => void;
};
/**
 * 安全连接
 */
export default class SSocket extends EventEmitter<EventType> {
   public type: "accept" | "connect";
   private socket: net.Socket;
   private cipher: Cipher | undefined;
   private face: number = 99;
   private stream = new Stream();
   private _id: string;
   /** 最后一次心跳检测时间 */
   lastHeartbeat: number = Date.now();
   /**　状态机 */
   private cmdClose: boolean = false;
   private onResetHandle: (ssocket: SSocket) => void;
   constructor(socket: net.Socket, cipher?: Cipher, face: number = 99) {
      super();
      this.socket = socket;
      this.cipher = cipher;
      this.face = face;
      this._id = (this.socket.remoteAddress || "") + (this.socket.remotePort ? ":" + this.socket.remotePort || "" : "") + "-" + buildSN(3);
      socket.setMaxListeners(99);
      socket.setKeepAlive(true, 60 * 1000);
      this.initEvent();
   }
   get id(): string {
      return this._id;
   }
   private initEvent() {
      this.socket.once("connect", () => this.emit("connect", this));
      this.socket.once("error", (err) => this.emit("error", err));
      this.socket.on("data", (chunk) => {
         chunk = this.decode(chunk);
         if (chunk.byteLength <= 1) return;
         this.emit("data", chunk);
      });
      this.socket.once("close", () => this.emit("close", true));
      this.socket.once("timeout", () => this.emit("error", new Error("timeout")));
      this.stream.on("heartbeat", (ssocket) => {
         //console.info("event heartbeat", this.id, ssocket.socket.readyState);
         this.lastHeartbeat = Date.now();
      });
   }
   /**
    * 开启心跳检测
    * @param timeout 检测周期
    */
   heartbeat(timeout: number = 60 * 1000) {
      if (this.socket.readyState == "closed") return;
      if (this.protocol == "direct") return;
      this.lastHeartbeat = Date.now();
      let delay = Math.ceil(timeout / 2);
      let pid = setInterval(() => {
         if (this.socket.readyState == "closed") return clearInterval(pid);
         const ttl = Date.now() - this.lastHeartbeat;
         /** 心跳检测 判断是否超时 */
         if (ttl >= timeout) {
            //logger.info("lost connection", this.socket.remoteAddress || "");
            this.socket.emit("timeout");
            this.socket.destroy();
            return;
         }
         /** 心跳检测 发送检测包到远程 */
         if (ttl >= delay) this.write(Buffer.from([CMD.HEARTBEAT]));
      }, 10 * 1000);
      this.socket.once("close", () => clearInterval(pid));
   }
   getSession(socket?: net.Socket) {
      return Sessions.instance.getSession(socket || this.socket);
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
   get remotePort(): number {
      return this.socket.remotePort || 0;
   }
   get localAddress(): string {
      return this.socket.localAddress || "";
   }
   get localPort(): number {
      return this.socket.localPort || 0;
   }
   get destroyed() {
      return this.socket.destroyed;
   }
   async destroy(err?: Error) {
      if (this.destroyed) return;
      this.socket.destroy(err);
      this.clear();
   }
   /** 假关闭 */
   async destroyFace() {
      if (this.destroyed) {
         this.emit("close", true);
         this.removeListener("close");
         return;
      }
      if (this.protocol != "wrtc") {
         this.destroy();
         return;
      }
      this.type == "connect" && setTimeout(() => multi.add(this), 100);
      if (this.cmdClose) return;
      await this.write(Buffer.from([CMD.CLOSE]));
      this.emit("close", false);
   }
   setTimeout(ttl: number = 0) {
      this.socket.setTimeout(ttl);
   }

   on<T extends EventEmitter.EventNames<EventType>>(event: T, fn: EventEmitter.EventListener<EventType, T>) {
      if (event == "reset") {
         this.removeAllListeners("reset");
         this.onResetHandle = <any>fn;
         return this;
      }
      super.on(event, fn);
      return this;
   }
   once<T extends EventEmitter.EventNames<EventType>>(event: T, fn: EventEmitter.EventListener<EventType, T>) {
      if (event == "reset") {
         this.removeAllListeners("reset");
         this.onResetHandle = <any>fn;
         return this;
      }
      super.once(event, fn);
      return this;
   }
   /*    on(name: string, listener: (...args: any[]) => void) {
      if (name == "read") {
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
   } */
   async write(chunk: Buffer | string): Promise<void> {
      //console.info("write1",!!this.cipher, [...chunk], chunk.toString());
      /*       if (this.cipher) {
         chunk = this.cipher.encode(chunk instanceof Buffer ? chunk : Buffer.from(chunk), this.face);
      } */
      chunk = this.encode(chunk instanceof Buffer ? chunk : Buffer.from(chunk));
      //console.info("===send", chunk, this.socket.readyState);
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
   async read(timeout: number = 5000): Promise<Buffer> {
      let chunk = await this.stream.read(this.socket, timeout);
      if (chunk.byteLength == 1) return this.read(timeout);
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
      const onData = async (chunk: Buffer) => {
         if (this.cipher) {
            chunk = this.decode(chunk);
         }

         this.emit("read", {
            chunk,
            size: chunk.byteLength,
            session: this.getSession(this.socket),
            clientIp: this.socket.remoteAddress || "",
            protocol: this.protocol || "",
         });
         target.emit("write", {
            chunk,
            size: chunk.byteLength,
            session: this.getSession(target.socket),
            clientIp: target.socket.remoteAddress || "",
            protocol: target.protocol || "",
         });
         this.lastHeartbeat = Date.now();
         if (chunk.byteLength == 1) {
            let cmd = chunk[0]; // target.decode(chunk);
            //console.info("cmd==", cmd, this.type + ":" + this.protocol, target.type + ":" + target.protocol);
            switch (cmd) {
               case CMD.HEARTBEAT: //心跳检测指令
                  this.stream.emit("heartbeat", target);
                  return;
               case CMD.CLOSE: //关闭连接指令
                  //console.info("close--", this.type, this.protocol, target.type, target.protocol);
                  if (this.type == "accept" && this.protocol != "wrtc") {
                     this.destroy();
                     return;
                  }
                  if (this.type == "connect" && this.protocol == "wrtc") {
                     this.emit("close", false);
                     this.clear();
                  }
                  if (target.protocol == "direct") {
                     target.destroy();
                  } else {
                     await target.destroyFace();
                  }
                  multi.add(this);
                  this.cmdClose = true;
                  return;
               case CMD.RESET: //复位
                  //console.info("cmd==", cmd, Date.now(), this.type + ":" + this.protocol, target.type + ":" + target.protocol);
                  if (this.type == "accept" && this.protocol != "wrtc") {
                     this.destroy();
                     return;
                  }
                  this.cmdClose = false;
                  if (target.protocol == "direct") {
                     target.destroy();
                  }
                  if (this.type == "accept" && this.protocol == "wrtc") {
                     await this.socket.write(Buffer.from([CMD.RESPONSE]));
                     this.onResetHandle && this.onResetHandle(this.clone());
                  }
                  return;
               case CMD.RESPONSE:
                  this.emit("responseCMD");
                  return;
            }
            if (target.protocol == "direct") return;
         }
         if (!!target.cipher) {
            chunk = target.encode(chunk);
         }
         //console.info("send to server", this.id, target.id, chunk.toString());
         target.socket.write(chunk);
      };
      this.socket.on("data", onData);
      this.socket.once("close", () => {
         target.protocol == "direct" && target.destroy();
      });
      target.once("close", () => {
         this.socket.write(Buffer.from([CMD.CLOSE]));
      });

      /* this.socket
         .pipe(
            transform((chunk: Buffer, encoding, callback) => {
               if (this.cipher) {
                  chunk = this.decode(chunk);
               }
               if (!!target.cipher) {
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
         .pipe(
            transform((chunk: Buffer, encoding, callback) => {
               this.lastHeartbeat = Date.now();
               if (chunk.byteLength == 1) {
                  let hearts = target.decode(chunk);
                  if (hearts[0] == 0) {
                     this.stream.emit("heartbeat", target);
                     return;
                  }
               }
               callback(null, chunk);
            }),
         )
         .pipe(target.socket);  */
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
   clear() {
      //["connect", "data", "close", "error", "read", "write"].forEach((key: any) => this.removeAllListeners(key));
      this.removeAllListeners();
      this.socket.removeAllListeners();
   }
   clone() {
      this.clear();
      let nsocket = new SSocket(this.socket, this.cipher, this.face);
      nsocket.protocol = this.protocol;
      nsocket.type = this.type;
      nsocket._id = this._id;
      nsocket.onResetHandle = this.onResetHandle;
      return nsocket;
   }
}
