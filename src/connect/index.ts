import HttpConnect from "./http.connect";
import Socks5Connect from "./socks5.connect";
import DirectConnect from "./direct.connect";
import LightConnect from "./light.connect";
import Connect from "./connect";
//import ping from "ping";
import { Proxy, ConnectOptions, ConnectUser, AuthData } from "../types";
import ForwardHttpConnect from "./forward.http.connect";
import log from "../core/logger";
import EventEmitter from "eventemitter3";
import Sessions from "../core/sessions";
//import { Transform } from "stream";
import SSocket from "../core/ssocket";
import * as check from "../utils/check";
import { wait } from "../utils";
import logger from "../core/logger";

const isDev = process.env.NODE_ENV == "development";

const sessions = Sessions.instance;
export type RequestData = {
   host: string;
   port: number;
   source: string;
   status: "ok" | "no";
};

export type EventName = {
   request: (data: RequestData) => void;
   auth: (data: AuthData) => void;
   error: (err: Error) => void;
   open: () => void;
};
/**
 * 连接代理的封装类
 */
export default class ConnectFactor extends EventEmitter<EventName> {
   static HttpConnect = HttpConnect;
   static Socks5Connect = Socks5Connect;
   static DirectConnect = DirectConnect;
   static LightConnect = LightConnect;
   static Connect = Connect;
   private directConnectDomains: string[] = [];
   /** 连接器列表 */
   private connects: Map<string, Connect> = new Map();
   private options: ConnectOptions;
   /** 代理服务器信息 */
   public proxys: Proxy[] = [];
   constructor(options?: ConnectOptions) {
      super();
      //this.setMaxListeners(99);
      options = Object.assign({}, options);
      this.options = options;
      /**
       * 默认支持http,socks5,direct协议连接
       */
      let httpConnect = new HttpConnect();
      let socks5Connect = new Socks5Connect();
      let directConnect = new DirectConnect();
      let forwardHttpProxyConnect = new ForwardHttpConnect();
      let lightConnect = new LightConnect();

      this.register(httpConnect) //
         .register(socks5Connect) //
         .register(directConnect)
         .register(forwardHttpProxyConnect)
         .register(lightConnect);
   }
   /**
    * 注册连接方式
    * @param connect
    */
   public register(connect: Connect) {
      if (this.connects.has(connect.protocol)) {
         let exist = this.connects.get(connect.protocol);
         //exist?.removeAllListeners("read");
         //exist?.removeAllListeners("write");
         exist?.removeAllListeners("timeout");
      }
      /*  connect.on("read", ({ size, socket, protocol }) => {
         let session = sessions.getSession(socket);
         session && this.emit("read", { size, session, clientIp: socket.remoteAddress, protocol });
      });
      connect.on("write", ({ size, socket, protocol }) => {
         let session = sessions.getSession(socket);
         session && this.emit("write", { size, session, clientIp: socket.remoteAddress, protocol });
      }); */
      connect.on("auth", (data) => {
         //let session = sessions.getSession(data.socket);
         //session && this.emit("auth", { ...data, session, serverIp: data.socket.remoteAddress });
         this.emit("auth", data);
      });
      //this.on("auth", (data)=>console.info("====>>>>>000<<auth", data));
      //connect.setTimeout(7 * 1000, () => this.emit("timeout"));
      this.connects.set(connect.protocol, connect);
      return this;
   }

   public removeProxy(host: string, port: number) {
      let idx = this.proxys.findIndex((v) => v.host == host && v.port == port);
      this.proxys.splice(idx, 1);
   }
   /**
    * 删除所有代理
    */
   public removeAllProxy() {
      this.proxys.splice(0);
   }
   /**
    * 注册代理服务器
    * @param proxy
    */
   public registerProxy(proxy: Proxy): boolean {
      proxy.checked = proxy.checked == undefined ? true : proxy.checked;
      proxy.mode = proxy.mode == undefined ? 1 : proxy.mode;

      let existProxy = this.proxys.find((v) => v.host == proxy.host && v.port == proxy.port);
      if (existProxy) {
         existProxy.host = proxy.host;
         existProxy.port = proxy.port;
         existProxy.protocol = proxy.protocol;
         existProxy.username = proxy.username;
         existProxy.password = proxy.password;
         existProxy.secret = proxy.secret;
         existProxy.forward = proxy.forward;
         existProxy.checked = proxy.checked;
         existProxy.mode = proxy.mode;
      } else {
         this.proxys.push(proxy);
      }
      return true;
   }
   /**
    * 检测代理
    * @param callback
    *    {
    *       success： 成功数量
    *       fail: 失败数量
    *    }
    * @param interval 检测间隔，单位ms
    */
   public checkProxy(callback: (data: { success: number; fail: number }) => void, interval: number = 10 * 1000): void {
      (async () => {
         await wait(interval);
         while (true) {
            //5分钟检测一次
            let successNum = 0,
               failNum = 0;
            try {
               let proxyList = this.proxys;
               let tasks: Promise<boolean>[] = [];
               for (let i = 0; i < proxyList.length; i++) {
                  tasks.push(
                     new Promise(async (resolve) => {
                        let checked = false;
                        try {
                           let proxy = proxyList[i];
                           checked = await check.check(proxy).catch((err) => false); //https://api.myip.com/ http://httpbin.org/ip
                           if (checked) {
                              successNum++;
                              proxy.checked = true;
                           } else {
                              failNum++;
                              proxy.checked = false;
                           }
                        } catch (err) {
                        } finally {
                           resolve(checked);
                        }
                     }),
                  );
               }
               await Promise.all(tasks).catch((err) => []);
            } catch (err) {
               console.error("error====checked", err.message);
            } finally {
               try {
                  await wait(interval);
                  callback({ success: successNum, fail: failNum });
               } catch (err) {}
            }
         }
      })();
   }
   private findProxy(localSocket: SSocket, user?: ConnectUser) {
      let proxy: Proxy;
      let list: Proxy[] = this.proxys.filter((v) => v.checked);
      let hid0 = 0;
      if (user && user.username) {
         hid0 = hashId(user) % (list.length || 1);
         proxy = list[hid0];
      } else {
         hid0 = hashId({ username: "ip-" + localSocket.socket.localPort + "-" + localSocket.socket.remotePort, password: "", args: [] }) % (list.length || 1);
         proxy = list[hid0];
      }
      return proxy || this.proxys.find((v) => v.checked);
   }
   /**
    * 隧道转发数据
    * @param proxy
    * @param localSocket
    * @param chunk
    */
   public async pipe(host: string, port: number, localSocket: SSocket, chunk: Buffer, user?: ConnectUser) {
      if (!user || !user.username) {
         user = {
            username: "ip-" + localSocket.socket.localPort + "-" + localSocket.socket.remotePort,
            password: "",
            args: [],
         };
      }
      let proxy: Proxy = this.findProxy(localSocket, user);
      let connect: Connect | undefined = this.options.isDirect == true ? this.connects.get("direct") : this.connects.get(proxy.protocol);
      /*if (this.options.isDirect) connect = this.connects.get("direct");
       else {
         let isLocal = isDev ? false : await isLocalNetwork(host);
         //本地网络直连
         if (isLocal || this.options.isDirect) connect = this.connects.get("direct");
         else {
            assert.ok(proxy && proxy.host && proxy.port, "proxy host no exist");
            connect = this.connects.get(proxy.protocol);
         }
      } */
      //console.info("connect s1", connect?.protocol);
      if (connect?.protocol != "direct") {
         let domain = getDomainFromBytes(chunk);
         if (this.directConnectDomains.find((v) => new RegExp(`^.*${v}$`, "i").test(domain))) {
            log.log("===>direct connect", domain);
            connect = this.connects.get("direct");
         }
      }

      if (!connect) {
         localSocket.destroy(new Error("no handle protocol " + proxy.protocol));
         console.warn(`ipipe is no connector to connect target server`);
         return;
      }

      if (!proxy && connect.protocol != "direct") {
         localSocket.destroy(new Error(`ipipe connect is no proxy node`));
         log.warn(`ipipe connect is no proxy node`);
         return;
      }
      //let headers = parseHeader(chunk.toString());
      //连接目标超时
      //connect.setTimeout(15 * 1000, () => this.emit("timeout"));
      let isConnect = false;
      //是否可以纠错
      let isCorrection = proxy && connect.protocol != "direct" && proxy.mode == 1 && this.proxys.length > 1;
      let startTime = Date.now();
      await connect
         .connect(host, port, proxy, (err, proxySocket: SSocket) => {
            //, recChunk?: Buffer
            //console.info("ccxxxxx",connect?.protocol, host+":"+port, proxy, proxySocket.socket.remotePort, proxySocket.socket.localPort, err?.toString());
            //if (err) return !isCorrection ? (err instanceof Error ? localSocket.destroy(err) : localSocket.end(recChunk)) : undefined;
            if (err) {
               //console.info("error===", this.proxys.length, err.toString(), err instanceof Error, connect?.protocol, isCorrection);
               if (connect?.protocol == "direct") {
                  isConnect = true;
                  err instanceof Error ? localSocket.destroy(err) : localSocket.end(err);
               } else if (!isCorrection) {
                  err instanceof Error ? localSocket.destroy(err) : localSocket.end(err);
               }
               return;
            }
            this.emit("open");
            isConnect = true;
            localSocket.on("error", (err) => {
               logger.debug("error local", err.message);
               localSocket.destroy();
               proxySocket?.destroy();
            });
            localSocket.on("close", () => proxySocket?.end());
            proxySocket.on("error", (err) => {
               logger.debug("error proxy", err.message);
               proxySocket.destroy();
               localSocket.destroy();
            });
            proxySocket.on("close", () => localSocket.end());
            //if (recChunk) localSocket.write(recChunk);
            connect?.pipe(localSocket, proxySocket, chunk);
         })
         .catch((err) => {
            logger.debug("===>connect error", err);
            !isCorrection && localSocket.destroy(err);
            this.emit("error", err);
         });
      if (isCorrection && !isConnect) {
         let nproxys = [...this.proxys];
         nproxys = nproxys.sort((a, b) => (Math.floor(Math.random() * 2) == 0 ? -1 : 1));
         for (let cproxy of nproxys) {
            if (isConnect) continue;
            if (cproxy.host == proxy.host) continue;
            let sconnect: Connect | undefined = this.connects.get(cproxy.protocol);
            if (sconnect) {
               await sconnect
                  .connect(host, port, cproxy, (err, proxySocket: SSocket, recChunk?: Buffer) => {
                     if (err) return err instanceof Error ? localSocket.destroy(err) : localSocket.end(recChunk);
                     isConnect = true;
                     localSocket.on("error", (err) => {
                        logger.debug("error local", err.message);
                        localSocket.destroy();
                        proxySocket?.destroy();
                     });
                     localSocket.on("close", () => proxySocket?.end());
                     proxySocket.on("error", (err) => {
                        logger.debug("error proxy", err.message);
                        proxySocket.destroy();
                        localSocket.destroy();
                     });
                     proxySocket.on("close", () => localSocket.end());
                     if (recChunk) localSocket.write(recChunk);
                     sconnect?.pipe(localSocket, proxySocket, chunk);
                  })
                  .catch((err) => {
                     log.debug("===>connect error", err);
                     localSocket.destroy(err);
                  });
               break;
            }
         }
      }
      this.emit("request", { host: host, port: port, source: localSocket.remoteAddress, status: isConnect ? "ok" : "no" });
      if (!isConnect) {
         logger.debug("====>no connect");
         localSocket.destroy();
      }
   }

   /*   public async ping(host: string): Promise<boolean> {
      let res = await ping.promise.probe(host);
      //console.info("res", res.alive, res.avg);
      return res.alive == true;
   } */
   /**
    * 注册直接连接的域名
    * @param domain
    */
   public registerDirectDomain(domain: string) {
      domain = domain.replace(/^\*+/, "");
      if (this.directConnectDomains.includes(domain)) return;
      log.log("===>registerDirectDomain", domain);
      this.directConnectDomains.push(domain);
   }
   /**
    * 检测目标代理是否正常
    * @param proxy
    */
   /*   public async checkProxy(proxy: Proxy): Promise<boolean> {
      let connect = this.connects.get(proxy.protocol);

      return new Promise((resolve) => {
         if (!connect) return resolve(false);
         connect.connect(proxy.host, proxy.port, proxy, (err, proxySocket: net.Socket, recChunk?: Buffer) => {
            resolve(true);
         });
         //connect.on()
      });
   } */
}

function getDomainFromBytes(chunk: Buffer): string {
   let c0 = String.fromCharCode(chunk[0]).toUpperCase();
   if (chunk[0] == 22 && chunk[1] == 3) {
      //https
      let list: string[] = [];
      for (let i = 0; i < chunk.length - 10; i++) {
         if (
            chunk[i] == 0 &&
            chunk[i + 1] == 0 &&
            chunk[i + 2] == 0 &&
            chunk[i + 3] == 0 &&
            chunk[i + 4] == 0 && //
            chunk[i + 6] == 0 &&
            chunk[i + 8] == 0 &&
            chunk[i + 9] == 0
         ) {
            for (let j = i + 11; j < chunk.length; j++) {
               if (chunk[j] < 33 || chunk[j] > 126) break;
               list.push(String.fromCharCode(chunk[j]));
            }
         }
      }
      return list.join("");
   } else if (["G", "H", "P", "D", "O", "T", "C"].includes(c0)) {
      /*  case "G": //GET
      case "H": //HEAD
      case "P": //POST,PUT
      case "D": //DELETE
      case "O": //OPTIONS
      case "T": //TRACE
      case "C": //CONNECT */
      let headers = parseHeader(chunk.toString());
      let host = headers["host"];
      //let lines = chunk.toString().split(/\r\n/);
      //let ls = lines[0].split(" ");
      //console.info("ls===", ls, lines, headers);
      //let uuu = new URL(ls[1]);
      return host;
   }
   return "";
}

function parseHeader(str: string) {
   let lines = str.split("\r\n");
   let headers = {};
   lines.forEach((v) => {
      let ks = v.split(": ");
      if (ks.length < 2) return;
      let key = ks[0] || "",
         value = ks[1] || "";
      headers[key.trim().toLowerCase()] = value.trim();
   });
   return headers;
}

function hashId(user: ConnectUser) {
   let val = user.username + "_" + user.password + "_" + user.args.join("_");
   let res = 0;
   for (let v of val) {
      res += v.charCodeAt(0) ^ 111;
   }
   res = res % 666666;
   //console.info("hash", res, user.args)
   return res;
}
export { Connect as Connect, HttpConnect, Socks5Connect, DirectConnect };
