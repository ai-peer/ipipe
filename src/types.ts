import net from "net";
import ProxyServer from "transparent-proxy";

export interface Options {
   /** 是否直接连接目标 */
   isDirect?: boolean;
   auth?: {
      username: string;
      password: string;
   };
}
export interface Proxy {
   /** 协议 */
   protocol: string;
   /** 主机 */
   host: string;
   /** 端口 */
   port: number;
   /** 用户名 */
   username?: string;
   /** 密码 */
   password?: string;
   /** 转发主机  */
   forwardHost?: string;
   /** 转发主机端口 */
   forwardPort?: number;
}

/** 创建服务回调 */
export type CreateCallback = (server: net.Server) => void;

/**创建本地服务回调 */
export type LocalServerCallbacck = (server: ProxyServer) => void;
