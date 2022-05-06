import HttpConnect from "./http.connect";
import Socks5Connect from "./socks5.connect";
import DirectConnect from "./direct.connect";
import LightConnect from "./light.connect";
import Connect from "./connect";
import net from "net";
//import ping from "ping";
import { isLocalNetwork } from "../core/geoip";
import { Proxy, ConnectOptions, ConnectUser } from "../types";
import assert from "assert";
import ForwardHttpConnect from "./forward.http.connect";
import log from "../core/logger";
import EventEmitter from "events";
import Sessions from "../core/sessions";
import { Transform } from "stream";

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
   private proxys: Proxy[] = [];
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

      this.register(httpConnect).register(socks5Connect).register(directConnect).register(forwardHttpProxyConnect);
   }
   /**
    * 注册连接方式
    * @param connect
    */
   public register(connect: Connect) {
      if (this.connects.has(connect.protocol)) {
         let exist = this.connects.get(connect.protocol);
         exist?.removeAllListeners("read");
         exist?.removeAllListeners("write");
      }
      connect.on("read", ({ size, socket }) => {
         let session = sessions.getSession(socket);
         session && this.emit("read", { size, session, clientIp: socket.remoteAddress });
      });
      connect.on("write", ({ size, socket }) => {
         let session = sessions.getSession(socket);
         session && this.emit("write", { size, session, clientIp: socket.remoteAddress });
      });
      this.connects.set(connect.protocol, connect);
      return this;
   }
   /**
    * 注册代理服务器
    * @param proxy
    */
   public registerProxy(proxy: Proxy) {
      //this.proxy = proxy;
      this.proxys.push(proxy);
   }

   /**
    * 隧道转发数据
    * @param proxy
    * @param localSocket
    * @param chunk
    */
   public async pipe(host: string, port: number, localSocket: net.Socket, chunk: Buffer, user?: ConnectUser, inputTransform?: Transform) {
      let proxy: Proxy = this.proxys[0]; // = this.proxy;
      let connect: Connect | undefined;

      if (user) {
         let idx = hashId(user) % (this.proxys.length || 1);
         proxy = this.proxys[idx];
      }

      if (this.options.isDirect) connect = this.connects.get("direct");
      else {
         let isLocal = isDev ? false : await isLocalNetwork(host);
         //本地网络直连
         if (isLocal || this.options.isDirect) connect = this.connects.get("direct");
         else {
            assert.ok(proxy && proxy.host && proxy.port, "proxy host no exist");
            connect = this.connects.get(proxy.protocol);
         }
      }
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
         assert.ok(connect, "no handle protocol " + proxy.protocol);
      }

      connect.proxy = proxy;
      //console.info("===>ccc")
      connect.connect(host, port, (err, proxySocket: net.Socket, recChunk?: Buffer) => {
         if (err) return localSocket.destroy(err);
         localSocket.on("error", (err) => {
            localSocket.destroy();
            proxySocket?.destroy(err);
         });
         localSocket.on("close", () => proxySocket?.destroy());
         proxySocket.on("error", (err) => {
            proxySocket.destroy();
            localSocket.destroy(err);
         });
         proxySocket.on("close", () => localSocket.destroy());
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
         connect?.pipe(localSocket, proxySocket, chunk, inputTransform);
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
      res += v.charCodeAt(0) ^ 255;
   }
   res = res % 666666;
   return res;
}
export { Connect as Connect, HttpConnect, Socks5Connect, DirectConnect };
