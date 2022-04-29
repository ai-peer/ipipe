import net from "net";
import LocalTestProxyServer from "transparent-proxy";

/**
 * 接收器配置参数
 */
export interface AcceptOptions {
   /** 密钥 */
   secret?: string;
   isAccept?: boolean;
   auth?: {
      username: string;
      password: string;
   };
}
/**
 * 连接器配置参数
 */
export interface ConnectOptions {
   /** 是否直接连接目标 */
   isDirect?: boolean;
}
/**
 * 默认实例入口配置参数
 */
export interface Options extends AcceptOptions, ConnectOptions {}
/* export interface Options {
   isDirect?: boolean;
   isAccept?: boolean;
   auth?: {
      username: string;
      password: string;
   };
} */
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
export type LocalServerCallbacck = (server: LocalTestProxyServer) => void;
