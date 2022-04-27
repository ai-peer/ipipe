import HttpConnect from "./http.proxy.connect";
import Socks5Connect from "./socks5.proxy.connect";
import DirectConnect from "./direct.connect";
import Connect from "./connect";
import net from "net";
//import ping from "ping";
import { isLocalNetwork } from "../core/geoip";
import { Proxy } from "../types";
import assert from "assert";
import transform from "../core/transform";
import ForwardHttpProxyConnect from "./forward.http.proxy.connect";
import log from "../core/logger";
/**
 * 连接代理的封装类
 */
export default class ConnectFactor {
   private directConnectDomains: string[] = [];
   /** 连接器列表 */
   private connects: Map<string, Connect> = new Map();
   /** 代理服务器信息 */
   private proxy: Proxy;
   constructor() {
      /**
       * 默认支持http,socks5,direct协议连接
       */
      let httpConnect = new HttpConnect();
      let socks5Connect = new Socks5Connect();
      let directConnect = new DirectConnect();
      let forwardHttpProxyConnect = new ForwardHttpProxyConnect();
      this.register(httpConnect).register(socks5Connect).register(directConnect).register(forwardHttpProxyConnect);
   }
   /**
    * 注册连接方式
    * @param connect
    */
   public register(connect: Connect) {
      //console.info("===>register connect", connect.protocol);
      this.connects.set(connect.protocol, connect);
      return this;
   }
   /**
    * 注册代理服务器
    * @param proxy
    */
   public registerProxy(proxy: Proxy) {
      //console.info("===>register proxy", proxy);
      this.proxy = proxy;
   }

   /**
    * 隧道转发数据
    * @param proxy
    * @param localSocket
    * @param chunk
    */
   public async pipe(host: string, port: number, localSocket: net.Socket, chunk: Buffer) {
      let proxy = this.proxy;
      assert.ok(proxy, "proxy host no exist");
      let connect: Connect | undefined = this.connects.get(proxy.protocol);
      let isLocal = await isLocalNetwork(host);
      //本地网络直连
      if (isLocal) connect = this.connects.get("direct");

      //console.info("first chunk", chunk.toString(), [...chunk].join(","));
      let domain = getDomainFromBytes(chunk);
      //log.info("pipe===", domain)
      if (this.directConnectDomains.find((v) => new RegExp(`^.*${v}$`, "i").test(domain))) {
         log.log("===>direct connect", domain);
         connect = this.connects.get("direct");
      }
      //console.info("===>>", domain);

      if (!connect) {
         localSocket.destroy(new Error("no handle protocol " + proxy.protocol));
         assert.ok(connect, "no handle protocol " + proxy.protocol);
      }
      connect.proxy = proxy;
      connect.connect(host, port, (err, proxySocket: net.Socket) => {
         if (err) {
            return localSocket.destroy(err);
         }
         localSocket.on("error", (err) => {
            localSocket.destroy();
            proxySocket.destroy(err);
         });
         localSocket.on("close", () => proxySocket.destroy());
         proxySocket.on("error", (err) => {
            proxySocket.destroy();
            localSocket.destroy(err);
         });
         proxySocket.on("close", () => localSocket.destroy());
         localSocket
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
            .pipe(localSocket);
         proxySocket.write(chunk);
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
      let lines = chunk.toString().split(/\r\n/);
      let ls = lines[0].split(" ");
      let uuu = new URL(ls[1]);
      return uuu.hostname;
   }
   return "";
}

export { Connect, HttpConnect, Socks5Connect, DirectConnect };