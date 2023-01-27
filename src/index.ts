import SSocket from "./core/ssocket";

import Accept from "./accept/accept";
import LightAccept from "./accept/light.accept";
import Socks5Accept from "./accept/socks5.accept";
import HttpAccept from "./accept/http.accept";
import WrtcAccept from "./accept/wrtc.accept";
import Connect from "./connect/connect";
import LightConnect from "./connect/light.connect";
import Socks5Connect from "./connect/socks5.connect";
import HttpConnect from "./connect/http.connect";
import DirectConnect from "./connect/direct.connect";
import ForwardHttpConnect from "./connect/forward.http.connect";
import WrtcConnect from "./connect/wrtc.connect";

import AcceptFactor from "./accept";
import ConnectFactor, { RequestData } from "./connect";
import { Callback as ConnectCallback } from "./connect/connect";
export * from "./types";
import { Proxy, CreateCallback, Options, ReadData, WriteData, AcceptData, AuthData } from "./types";
import net from "net";
import EventEmitter from "eventemitter3";
import Cipher from "./core/cipher";
import { getPublicIp, isInLocalIp, isIpv4, isIpv6, isDomain } from "./core/geoip";
import * as check from "./utils/check";
import ua from "./utils/ua";
import * as password from "./core/password";
import XPeer from "./core/xpeer";

export type EventName = {
   out: (data: WriteData & { type: "accept" | "connect" }) => void;
   in: (data: ReadData & { type: "accept" | "connect" }) => void;
   request: (data: RequestData) => void;
   auth: (data: AuthData) => void;
   accept: (data: AcceptData) => void;
   error: (err: Error) => void;
   open: (id: string) => void;
};
export {
   password,
   SSocket,
   Accept,
   Connect,
   LightAccept,
   Socks5Accept,
   HttpAccept, //
   WrtcAccept,
   LightConnect,
   Socks5Connect,
   HttpConnect,
   ForwardHttpConnect,
   DirectConnect,
   WrtcConnect,
   Cipher,
   check,
   ua,
   getPublicIp,
   isInLocalIp,
   isIpv4,
   isIpv6,
   isDomain,
   ConnectCallback,
};

/**
 * 本地代理服务
 */
export default class IPipe extends EventEmitter<EventName> {
   static Accept = {
      LightAccept: AcceptFactor.LightAccept,
      Socks5Accept: AcceptFactor.Socks5Accept,
      HttpAccept: AcceptFactor.HttpAccept,
      Accept: AcceptFactor.Accept,
      WrtcAccept: WrtcAccept,
   };
   static Connect = {
      LightConnect: ConnectFactor.LightConnect,
      Socks5Connect: ConnectFactor.Socks5Connect,
      HttpConnect: ConnectFactor.HttpConnect,
      DirectConnect: ConnectFactor.DirectConnect,
      Connect: ConnectFactor.Connect,
      WrtcConnect: WrtcConnect,
   };
   private xpeer: XPeer;
   public connectFactor: ConnectFactor;
   public acceptFactor: AcceptFactor;
   constructor(options?: Options) {
      super();
      options = Object.assign({}, options);
      this.xpeer = new XPeer(options.peerId);
      this.acceptFactor = new AcceptFactor(options);
      this.connectFactor = new ConnectFactor(options);
      this.acceptFactor.registerConnect(this.connectFactor);

      this.acceptFactor.on("read", (data) => this.emit("out", { ...data, type: "accept" }));
      this.acceptFactor.on("write", (data) => this.emit("in", { ...data, type: "accept" }));
      this.connectFactor.on("request", (data) => this.emit("request", data));
      this.acceptFactor.on("auth", (data) => this.emit("auth", data));
      this.acceptFactor.on("accept", (data) => this.emit("accept", data));
      this.connectFactor.on("auth", (data) => this.emit("auth", data));
      this.acceptFactor.on("error", (err) => this.emit("error", err));
      this.connectFactor.on("error", (err) => this.emit("error", err));
      //this.connectFactor.on("read", (data) => this.emit(Event.in, data));
      //this.connectFactor.on("write", (data) => this.emit(Event.out, data));
   }
   close() {
      this.acceptFactor?.close();
   }
   /**
    * 创建连接接入服务
    * @param port 代理端口, 默认4321
    * @param host 代理ip, 默认0.0.0.0,代表所有ip都可以访问
    */
   createAcceptServer(port: number = 4321, host: string = "0.0.0.0", callback?: CreateCallback): Promise<net.Server> {
      let isSocketOpen = false;
      let pid = setTimeout(() => {
         if (isSocketOpen) {
            let id = XPeer.instance.id || "";
            this.emit("open", XPeer.instance.id || "");
            callback && callback(id);
         }
      }, 60 * 1000);
      XPeer.instance.once("open", (id) => {
         clearTimeout(pid);
         this.emit("open", id);
         callback && callback(id);
      });
      return this.acceptFactor.createServer(port, host, (...args) => {
         //this.emit("open");
         isSocketOpen = true;
      });
   }

   //registerServer(server: net.Server) {}

   /**
    * 注册本地接自定义接入协议， 原生支持http和socks5代理协议
    * 协议继承类Accept
    * @param accept
    */
   registerAccept(accept: Accept): this {
      accept.registerConnect(this.connectFactor);
      this.acceptFactor.register(accept);
      return this;
   }
   setTimeout(ttl: number = 0) {
      this.acceptFactor.setTimeout(ttl);
   }
   /**
    * 注册连接远程代理服务器自定义协议， 原生支持http,socks5协议,forward.http http转发协议
    * 协议继承类 Connect
    * @param connect
    */
   registerConnect(connect: Connect): this {
      this.connectFactor.register(connect);
      return this;
   }
   /**
    * 注册远程代理服务器信息
    * @param proxy
    */
   registerProxy(proxy: Proxy): boolean {
      let checked = this.connectFactor.registerProxy(proxy);
      return checked;
   }
   /**
    * 获取所有代理列表
    */
   getProxys(): Proxy[] {
      return this.connectFactor.proxys;
   }

   /**
    * 注册直接连接的域名, 无需走代理
    * @param domain
    */
   registerDirectDomain(domain: string): this {
      this.connectFactor.registerDirectDomain(domain);
      return this;
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
      this.connectFactor.checkProxy(callback, interval);
   }

   async getPublicIp() {
      return getPublicIp();
   }
}
