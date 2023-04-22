import net from "net";
import Connect, { Callback } from "./connect";
import { Proxy, ProxyMode } from "../types";
import SSocket from "../core/ssocket";
import { buildSN } from "../core/password";
import assert from "assert";
import * as http from "./protocol/http";

/**
 * 透过中转服务转发连接http代理连接
 */
export default class ForwardHttpConnect extends Connect {
   constructor() {
      super({
         protocol: "forward.http",
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
      let mode = proxy.mode == undefined || String(proxy.mode) == "undefined" ? 1 : proxy.mode;
      proxy.mode = mode;

      return new Promise((resolve, reject) => {
         let isTimeout = true,
            pid;
         let forward = proxy.forward;
         assert.ok(!!forward, "forward is null");
         let socket = net.connect(forward.port || 0, forward.host, async () => {
            try {
               isTimeout = false;
               pid && clearTimeout(pid);
               let ssocket = new SSocket(socket);
               ssocket.protocol = this.protocol;
               ssocket.type = "connect";
               ssocket.on("read", (data) => this.emit("read", data));
               ssocket.on("write", (data) => this.emit("write", data));
               let isAuth = !!proxy.username && !!proxy.password;
               let isAuthForward = !!forward?.username && !!forward?.password;
               /*  let pwd = proxy.password || "";
               pwd = proxy.mode == 1 ? pwd + "_" + proxy.mode + "_" + buildSN(6) : pwd + "_" + proxy.mode;
               let up = proxy.username + ":" + pwd;
               up = Buffer.from(up).toString("base64"); */
               //let up = Buffer.from(this.buildHttpProxyAuthorization({ mode, username: proxy.username || "", password: proxy.password || "" })).toString("base64");
               //let upForward = Buffer.from(this.buildHttpProxyAuthorization({ mode, username: forward?.username || "", password: forward?.password || "" })).toString("base64");

               /**  第一步连接中转服务器 */
               let connectChunk = http.buildConnectChunk({ mode, host: proxy.host || "", port: proxy.port || 0, username: forward?.username, password: forward?.password });
               /* let sendChunk = Buffer.concat([
                  Buffer.from(`CONNECT ${proxy.host}:${proxy.port} HTTP/1.1\r\n`), //
                  Buffer.from(`Host: ${proxy.host}:${proxy.port}\r\n`), //
                  Buffer.from(`Proxy-Connection: keep-alive\r\n`), //
                  Buffer.from(isAuthForward ? `Proxy-Authorization: Basic ${upForward}\r\n` : ""),
                  Buffer.from("\r\n"),
               ]); */
               await ssocket.write(connectChunk);
               let receiveChunk = await ssocket.read(2000);
               let statusCode = receiveChunk.toString().split(" ")[1];
               let checkedAuthForward = statusCode == "200";
               if (isAuthForward || statusCode == "407") {
                  this.emit("auth", {
                     checked: checkedAuthForward,
                     type: "connect",
                     protocol: "forward.http",
                     session: this.getSession(socket),
                     clientIp: "127.0.0.1",
                     username: forward?.username || "",
                     password: forward?.password || "",
                     args: (forward?.password || "").split("_").slice(1),
                  });
               }
               if (!checkedAuthForward) {
                  this.emit("error", new Error(`connect forward.http[${proxy.host}:${proxy.port}] error`));
                  socket.destroy(new Error(receiveChunk.toString()));
                  callback(undefined, ssocket, { host, port });
                  resolve(ssocket);
                  return;
               }

               /** 第二步 通过中转服务器连接到目标代理服务器 */
               /*   sendChunk = Buffer.concat([
                  Buffer.from(`CONNECT ${host}:${port} HTTP/1.1\r\n`), //
                  Buffer.from(`Host: ${host}:${port}\r\n`), //
                  Buffer.from(`Proxy-Connection: keep-alive\r\n`), //
                  //Buffer.from(`User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.2612.71 Safari/537.36\r\n`), //
                  Buffer.from(isAuth ? `Proxy-Authorization: Basic ${up}\r\n` : ""),
                  Buffer.from("\r\n"),
               ]); */
               let connectChunk2 = http.buildConnectChunk({ mode, host: host || "", port: port, username: proxy.username, password: proxy.password });
               await this.write(socket, connectChunk2);
               receiveChunk = await this.read(socket);
               statusCode = receiveChunk.toString().split(" ")[1];
               let checkedAuth = statusCode == "200";
               if (isAuth || statusCode == "407") {
                  this.emit("auth", {
                     checked: checkedAuth,
                     type: "connect",
                     protocol: "forward.http",
                     session: this.getSession(socket),
                     clientIp: "127.0.0.1",
                     username: proxy?.username || "",
                     password: proxy?.password || "",
                     args: (proxy.password || "").split("_").slice(1),
                  });
               }
               ssocket.heartbeat();
               callback(checkedAuth ? undefined : receiveChunk, ssocket, { host, port });
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
      });
   }
}
