import net from "net";
import Connect, { Callback } from "./connect";
import assert from "assert";
import { Proxy } from "..//types";
import SSocket from "../core/ssocket";
import { buildSN } from "../core/password";
import XPeer from "../core/xpeer";
import multi from "../core/multiplexing";
import { CMD } from "../types";

/**
 * http代理连接
 */
export default class WrtcConnect extends Connect {
   constructor() {
      super({
         protocol: "wrtc",
      });
      this.timeout = 30 * 60 * 1000;
   }
   public setTimeout(ttl: number = 30 * 60 * 1000) {
      if (ttl > 0) this.timeout = ttl;
   }
   /**
    * 连接远程代理主机
    * @param host 目标主机ip或域名
    * @param port 目标主机端口
    * @param proxy 代理服务器信息
    * @param callback 连接成功后的回调方法
    */
   public async connect(host: string, port: number, proxy: Proxy, callback: Callback): Promise<SSocket> {
      const mode = proxy.mode == undefined || String(proxy.mode) == "undefined" ? 1 : proxy.mode;
      proxy.mode = mode;
      const peerId = proxy.host + (proxy.port ? ":" + proxy.port : "");
      return new Promise(async (resolve, reject) => {
         let isTimeout = true,
            pid;
         let startTime = Date.now();
         //console.info("connect wrtc proxy", host + ":" + port, "proxy", peerId);
         const xpeer = XPeer.instance;
         const onConnect = async (ssocket: SSocket) => {
            try {
               isTimeout = false;
               pid && clearTimeout(pid);
               //let ssocket = new SSocket(socket);
               ssocket.protocol = this.protocol;
               ssocket.type = "connect";
               ssocket.on("read", (data) => this.emit("read", data));
               ssocket.on("write", (data) => this.emit("write", data));

               let usePassword = !!proxy.username && !!proxy.password;
               let pwd = proxy.password || "";
               pwd = proxy.mode == 1 ? pwd + "_" + proxy.mode + "_" + buildSN(6) : pwd + "_" + proxy.mode;
               let up = proxy.username + ":" + pwd;
               up = Buffer.from(up).toString("base64");
               let connectChunk = Buffer.concat([
                  Buffer.from(`WRTC/1.0 ${host}:${port}\r\n`), //
                  Buffer.from(`Host: ${host}:${port}\r\n`), //
                  Buffer.from(`Proxy-Connection: keep-alive\r\n`), //
                  //Buffer.from(`User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.2612.71 Safari/537.36\r\n`), //
                  Buffer.from(usePassword ? `Proxy-Authorization: Basic ${up}\r\n` : ""),
                  Buffer.from("\r\n"),
               ]);
               //let connectChunk = http.buildConnectChunk({ mode, host: host, port: port, username: proxy.username, password: proxy.password });
               //console.info("first send connectChunk", usePassword, connectChunk.toString());
               await ssocket.write(connectChunk);
               //console.info("write 1");
               let receiveChunk = await ssocket.read(1000);
               if (receiveChunk.byteLength < 1) {
                  callback(new Error("connect ready nodata"), ssocket, { host, port });
                  return;
               }
               //console.info("read 2", receiveChunk.toString());
               let statusCode = receiveChunk.toString().split(" ")[1];
               let checked = statusCode == "200"; //407 auth 失败
               //console.info("receiveChunk", statusCode, checked, usePassword, receiveChunk.toString());

               if (usePassword || statusCode == "407") {
                  this.emit("auth", {
                     checked: checked,
                     type: "connect",
                     protocol: "wrtc",
                     session: ssocket.id, //this.getSession(socket),
                     clientIp: ssocket.remoteAddress || "",
                     username: proxy.username || "",
                     password: proxy.password || "",
                     args: (proxy.password || "").split("_").slice(1),
                  });
               }
               ssocket.heartbeat();
               ssocket.once("close", (real) => {
                  if (real == false) {
                     multi.add(ssocket);
                  }
               });
               ssocket.on("data", (chunk: Buffer) => {
                  if (chunk.byteLength == 1 || chunk.length == 1) {
                     switch (chunk[0]) {
                        case CMD.CLOSE:
                           ssocket.emit("close", false);
                           return;
                     }
                  }
               });
               callback(checked ? undefined : receiveChunk, ssocket, { host, port });
               resolve(ssocket);
            } catch (err) {
               ssocket.emit("error", err);
            }
         };
         const connect = () => {
            let socket = xpeer.connect(peerId, async () => {
               pid && clearTimeout(pid);
               onConnect(new SSocket(socket));
            });
            pid = setTimeout(() => isTimeout && socket.destroy(new Error("timeout")), 30 * 1000);
            socket.once("timeout", () => {
               let error = new Error(`WRTC/1.0 500 timeout`);
               socket.emit("error", error);
               this.emit("timeout");
            });
            socket.once("error", (err) => {
               socket.destroy(err);
               this.emit("error", err);
               callback(err, new SSocket(socket), { host, port });
               resolve(new SSocket(socket));
            });
         };
         let ssocket = multi.get(peerId, "");
         console.info("get xxx", peerId, !!ssocket);
         if (ssocket) {
            await ssocket.write(Buffer.from([CMD.RESET]));
            let cmds = await ssocket.read(1000);
            if (cmds.byteLength == 1 && cmds[0] == CMD.RESPONSE) {
               onConnect(ssocket);
            } else {
               connect();
            }
         } else {
            connect();
         }

         /*     socket.on("close", (err) => {
            console.info("==========close======")
         }); */
      });
   }
}
