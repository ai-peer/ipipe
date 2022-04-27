import AcceptFactor from "./accept";
import Accept from "./accept/accept";
import Connect from "./connect/connect";
import ConnectFactor from "./connect";
import { Proxy, CreateCallback, LocalServerCallbacck } from "./types";
import LocalServer from "./local.server";
import net from "net";

/**
 * 本地代理服务
 */
export default class ProxyServer {
   private connectFactor: ConnectFactor;
   private acceptFactor: AcceptFactor;
   private localServer: LocalServer;
   constructor() {
      this.localServer = new LocalServer();
      this.connectFactor = new ConnectFactor();
      this.acceptFactor = new AcceptFactor();
      this.acceptFactor.registerConnect(this.connectFactor);
   }
   /**
    * 创建本地代理接入服务
    * @param port 本地代理端口
    * @param host 本地代理ip, 默认0.0.0.0,代表所有ip都可以访问
    */
   createAcceptServer(port: number = 4321, host: string = "0.0.0.0", callback?: CreateCallback): Promise<net.Server> {
      return this.acceptFactor.createServer(port, host, callback);
   }
   /**
    * 创建本地代理服务
    * @param port
    * @param host
    * @param callback
    */
   createLocalProxyServer(port: number = 0, host: string = "0.0.0.0", callback?: LocalServerCallbacck): Promise<net.Server> {
      return new Promise((resolve) => {
         this.localServer.createServer(port, host, (server) => {
            let address = server.address();
            /*  this.registerProxy({
               host: "127.0.0.1",
               port: address.port,
               protocol: "http",
               //username: 'user',
               //password: '12345'
            }); */
            callback && callback(server);
            resolve(server);
         });
      });
   }

   /**
    * 注册本地接收接入协议， 原生支持http和socks5代理协议
    * 协议继承类Accept
    * @param accept
    */
   registerAccept(accept: Accept) {
      accept.registerConnect(this.connectFactor);
      this.acceptFactor.register(accept);
   }
   /**
    * 注册连接远程代理服务器协议， 原生支持http和socks5协议
    * 协议继承类 Connect
    * @param connect
    */
   registerConnect(connect: Connect) {
      this.connectFactor.register(connect);
   }
   /**
    * 注册远程代理服务器
    * @param proxy
    */
   registerProxy(proxy: Proxy) {
      this.connectFactor.registerProxy(proxy);
   }
   /**
    * 注册直接连接的域名, 无需走代理
    * @param domain
    */
   registerDirectDomain(domain: string) {
      this.connectFactor.registerDirectDomain(domain);
   }
}
