import HttpConnect from "./http.connect";
import Socks5Connect from "./socks5.connect";
import DirectConnect from "./direct.connect";
import LightConnect from "./light.connect";
import Connect from "./connect";
//import ping from "ping";
import { Proxy, ConnectOptions, ConnectUser } from "../types";
import ForwardHttpConnect from "./forward.http.connect";
import log from "../core/logger";
import EventEmitter from "events";
import Sessions from "../core/sessions";
//import { Transform } from "stream";
import SSocket from "../core/ssocket";
import * as check from "../utils/check";
import { wait } from "../utils";

const isDev = process.env.NODE_ENV == "development";

const sessions = Sessions.instance;
/**
 * 连接代理的封装类
 */
export default class ConnectFactor extends EventEmitter {
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
      this.setMaxListeners(99);
      this.options = Object.assign({}, options);
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
         let session = sessions.getSession(data.socket);
         session && this.emit("auth", { ...data, session, serverIp: data.socket.remoteAddress });
      });
      connect.setTimeout(15 * 1000, () => this.emit("timeout"));
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
      proxy.random = proxy.random == undefined ? false : proxy.random;

      let existProxy = this.proxys.find((v) => v.host == proxy.host && v.port == proxy.port);
      if (existProxy) {
         existProxy.protocol = proxy.protocol;
         existProxy.username = proxy.username;
         existProxy.password = proxy.password;
         existProxy.secret = proxy.secret;
         existProxy.forwardHost = proxy.forwardHost;
         existProxy.forwardPort = proxy.forwardPort;
         existProxy.checked = proxy.checked;
         existProxy.random = proxy.random;
      } else {
         this.proxys.push(proxy);
      }
      // 循环检测代理好坏,1分钟检测一次
      /*       let host = proxy.host,
         port = proxy.port;
      setInterval(async () => {
         try {
            existProxy = this.proxys.find((v) => v.host == host && v.port == port);
            if (existProxy) {
               let checked = await check.check(existProxy).catch((err) => false);
               existProxy.checked = checked;
            }
         } catch (err) {}
      }, 30 * 1000); */
      return true;
   }
   /**
    * 检测代理
    * @param callback 
    *    {
    *       success： 成功数量
    *       fail: 失败数量
    *    }
    */
   public checkProxy(callback: (data: { success: number; fail: number }) => void): void {
      (async () => {
         await wait(10 * 1000);
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
                        let proxy = proxyList[i];
                        let checked = false;
                        try {
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
               //console.debug("error====checked", err.message);
            } finally {
               await wait(10 * 1000);
               //console.info(`check proxy pool success=${successNum} fail=${failNum}`);
               callback({ success: successNum, fail: failNum });
            }
         }
      })();
   }
   private findProxy(localSocket: SSocket, user?: ConnectUser) {
      let proxy: Proxy;
      let list: Proxy[] = this.proxys.filter((v) => v.checked);
      if (user) {
         let idx = hashId(user) % (list.length || 1);
         proxy = list[idx];
      } else {
         let idx = hashId({ username: localSocket.remoteAddress || "", password: "", args: [] }) % (list.length || 1);
         proxy = list[idx];
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
            username: "ip-" + localSocket.remoteAddress,
            password: "",
            args: [],
         };
      }
      let proxy: Proxy = this.findProxy(localSocket, user);

      /*  if (user) {
         let idx = hashId(user) % (this.proxys.length || 1);
         proxy = this.proxys[idx];
      } else {
         let idx = hashId({ username: localSocket.remoteAddress || "", password: "", args: [] }) % (this.proxys.length || 1);
         proxy = this.proxys[idx];
      } */
      //proxy = proxy || this.proxys[0];
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
      //console.info("connect s1");
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
         localSocket.destroy();
         log.warn(`ipipe connect is no proxy node`);
         return;
      }
      //连接目标超时
      //connect.setTimeout(15 * 1000, () => this.emit("timeout"));
      connect
         .connect(host, port, proxy, (err, proxySocket: SSocket, recChunk?: Buffer) => {
            if (err) {
               if (err instanceof Error) {
                  localSocket.destroy(err);
               } else {
                  localSocket.end(recChunk);
               }
               return;
            }
            localSocket.on("error", (err) => {
               localSocket.destroy();
               proxySocket?.destroy(err);
            });
            localSocket.on("close", () => proxySocket?.end());
            proxySocket.on("error", (err) => {
               proxySocket.destroy();
               localSocket.destroy(err);
            });
            proxySocket.on("close", () => localSocket.end());
            if (recChunk) localSocket.write(recChunk);
            /*  localSocket
            .pipe(
               transform((chunk, encoding, callback) => {
                  //console.info("\r\nchunk===1", chunk.toString(), [...chunk].slice(0, 128).join(","));
                  callback(null, chunk);
               }),
            )
            .pipe(proxySocket)
            .pipe(
               transform((chunk: Buffer, encoding, callback) => {
                  //console.info("\r\nchunk===2", chunk.toString(), [...chunk].slice(0, 128).join(","));
                  callback(null, chunk);
               }),
            )
            .pipe(localSocket); */
            connect?.pipe(localSocket, proxySocket, chunk);
         })
         .catch((err) => {
            log.debug("===>connect error", err.message);
            localSocket.destroy(err);
         });
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
