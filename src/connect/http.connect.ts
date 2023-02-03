import net from "net";
import Connect, { Callback } from "./connect";
import assert from "assert";
import { Proxy } from "..//types";
import SSocket from "../core/ssocket";
import { buildSN } from "../core/password";
import * as http from "./protocol/http";

/**
 * http代理连接
 */
export default class HttpConnect extends Connect {
   constructor() {
      super({
         protocol: "http",
      });
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
      return new Promise((resolve, reject) => {
         let isTimeout = true,
            pid;
         //console.info("conext http proxy", host+":"+port, "proxy", proxy.host+":"+proxy.port);
         let socket = net.connect(proxy.port, proxy.host, async () => {
            try {
               isTimeout = false;
               pid && clearTimeout(pid);
               let ssocket = new SSocket(socket);
               ssocket.protocol = this.protocol;
               ssocket.type = "connect";
               ssocket.on("read", (data) => this.emit("read", data));
               ssocket.on("write", (data) => this.emit("write", data));
               let usePassword = !!proxy.username && !!proxy.password;
               /*       let pwd = proxy.password || "";
               pwd = proxy.mode == 1 ? pwd + "_" + proxy.mode + "_" + buildSN(6) : pwd + "_" + proxy.mode;
               let up = proxy.username + ":" + pwd;
               up = Buffer.from(up).toString("base64");
               let sendChunk = Buffer.concat([
                  Buffer.from(`CONNECT ${proxy.host}:${proxy.port} HTTP/1.1\r\n`), //
                  Buffer.from(`Host: ${proxy.host}:${proxy.port}\r\n`), //
                  Buffer.from(`Proxy-Connection: keep-alive\r\n`), //
                  //Buffer.from(`User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.2612.71 Safari/537.36\r\n`), //
                  Buffer.from(usePassword ? `Proxy-Authorization: Basic ${up}\r\n` : ""),
                  Buffer.from("\r\n"),
               ]); */
               let connectChunk = http.buildConnectChunk({ mode, host: host, port: port, username: proxy.username, password: proxy.password });
               //console.info("first send", usePassword, connectChunk.toString());
               await ssocket.write(connectChunk);
               let receiveChunk = await ssocket.read(2000);
               let statusCode = receiveChunk.toString().split(" ")[1];
               let checked = statusCode == "200"; //407 auth 失败
               //console.info("receiveChunk", statusCode, checked, usePassword, receiveChunk.toString());
               if (usePassword || statusCode == "407") {
                  this.emit("auth", {
                     checked: checked,
                     type: "connect",
                     protocol: "http",
                     session: this.getSession(socket),
                     clientIp: socket.remoteAddress || "",
                     username: proxy.username || "",
                     password: proxy.password || "",
                     args: (proxy.password || "").split("_").slice(1),
                  });
               }
               ssocket.heartbeat();
               callback(checked ? undefined : receiveChunk, ssocket, { host, port });
               resolve(ssocket);
            } catch (err) {
               socket.emit("error", err);
            }
         });
         if (this.timeout > 0) pid = setTimeout(() => isTimeout && socket.emit("timeout"), this.timeout);
         socket.once("timeout", () => {
            let error = new Error(`HTTP/1.1 500 timeout[${this.timeout}]`);
            socket.emit("error", error);
            this.emit("timeout");
            //callback(error, new SSocket(socket));
         });
         socket.once("error", (err) => {
            socket.destroy();
            this.emit("error", err);
            callback(err, new SSocket(socket), { host, port });
            resolve(new SSocket(socket));
         });
         /*     socket.on("close", (err) => {
            console.info("==========close======")
         }); */
      });
   }
}
