import AcceptFactor from "./accept";
import Accept from "./accept/accept";
import Connect from "./connect/connect";
import ConnectFactor from "./connect";
import { Proxy, CreateCallback, LocalServerCallbacck, Options, AcceptAuth } from "./types";
import LocalServer, { Options as LocalOptions } from "./local.server";
import net from "net";
import EventEmitter from "events";

const Event = {
   out: "out",
   in: "in",
};
/**
 * 本地代理服务
 */
export default class IPipe extends EventEmitter {
   static Event = Event;
   public connectFactor: ConnectFactor;
   public acceptFactor: AcceptFactor;
   private localServer: LocalServer;
   constructor(options?: Options) {
      super();
      this.setMaxListeners(99);
      this.localServer = new LocalServer();
      this.acceptFactor = new AcceptFactor(options);
      this.connectFactor = new ConnectFactor(options);
      this.acceptFactor.registerConnect(this.connectFactor);

      this.acceptFactor.on("read", (data) => this.emit(Event.in, data));
      this.acceptFactor.on("write", (data) => this.emit(Event.out, data));
      this.connectFactor.on("read", (data) => this.emit(Event.in, data));
      this.connectFactor.on("write", (data) => this.emit(Event.out, data));
   }
   close() {
      this.acceptFactor?.close();
      this.localServer?.close();
   }
   /**
    * 创建连接接入服务
    * @param port 代理端口, 默认4321
    * @param host 代理ip, 默认0.0.0.0,代表所有ip都可以访问
    */
   createAcceptServer(port: number = 4321, host: string = "0.0.0.0", callback?: CreateCallback): Promise<net.Server> {
      return this.acceptFactor.createServer(port, host, callback);
   }
   /**
    * 创建测试代理服务, 用于测试使用
    * @param port
    * @param host
    * @param callback
    */
   createTestProxyServer(port: number = 0, host: string = "0.0.0.0", options?: LocalOptions, callback?: LocalServerCallbacck): Promise<net.Server> {
      return new Promise((resolve) => {
         this.localServer.createServer(port, host, options, (server) => {
            callback && callback(server);
            resolve(server);
         });
      });
   }

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
   registerProxy(proxy: Proxy): this {
      this.connectFactor.registerProxy(proxy);
      return this;
   }
   /**
    * 注册直接连接的域名, 无需走代理
    * @param domain
    */
   registerDirectDomain(domain: string): this {
      this.connectFactor.registerDirectDomain(domain);
      return this;
   }
}
