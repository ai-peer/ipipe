import SSocket from "./core/ssocket";

import Accept from "./accept/accept";
import LightAccept from "./accept/light.accept";
import Socks5Accept from "./accept/socks5.accept";
import HttpAccept from "./accept/http.accept";
import Connect from "./connect/connect";
import LightConnect from "./connect/light.connect";
import Socks5Connect from "./connect/socks5.connect";
import HttpConnect from "./connect/http.connect";
import DirectConnect from "./connect/direct.connect";

import AcceptFactor from "./accept";
import ConnectFactor from "./connect";
import { Proxy, CreateCallback, Options } from "./types";
import net from "net";
import EventEmitter from "events";
import * as Type from "./types";
import Cipher from "./core/cipher";
import { getPublicIp } from "./core/geoip";
import * as check from "./utils/check";
import ua from "./utils/ua";

export const Event = {
   out: "out",
   in: "in",
};

export {
   SSocket,
   Accept,
   Connect,
   LightAccept,
   Socks5Accept,
   HttpAccept, //
   LightConnect,
   Socks5Connect,
   HttpConnect,
   DirectConnect,
   Cipher,
   check,
   ua,
};

/**
 * 本地代理服务
 */
export default class IPipe extends EventEmitter {
   static Accept = {
      LightAccept: AcceptFactor.LightAccept,
      Socks5Accept: AcceptFactor.Socks5Accept,
      HttpAccept: AcceptFactor.HttpAccept,
      Accept: AcceptFactor.Accept,
   };
   static Connect = {
      LightConnect: ConnectFactor.LightConnect,
      Socks5Connect: ConnectFactor.Socks5Connect,
      HttpConnect: ConnectFactor.HttpConnect,
      DirectConnect: ConnectFactor.DirectConnect,
      Connect: ConnectFactor.Connect,
   };
   static Event = Event;
   public connectFactor: ConnectFactor;
   public acceptFactor: AcceptFactor;
   constructor(options?: Options) {
      super();
      this.setMaxListeners(99);
      options = options || {};
      this.acceptFactor = new AcceptFactor(options);
      this.connectFactor = new ConnectFactor(options);
      this.acceptFactor.registerConnect(this.connectFactor);

      this.acceptFactor.on("read", (data) => this.emit(Event.in, data));
      this.acceptFactor.on("write", (data) => this.emit(Event.out, data));
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
      return this.acceptFactor.createServer(port, host, callback);
   }

   registerServer(server: net.Server) {}

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
   async checkProxy(proxy: Proxy) {}

   async getPublicIp() {
      return getPublicIp();
   }
}
