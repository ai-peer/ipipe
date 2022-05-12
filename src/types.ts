import net from "net";

export const DefaultSecret =
   "lOfGpnn7nZ7KODmxUckw4GhMY95vA/LvlnMcbjNZ9hapILXX20KAClDxB8QjCUElRHfZhrgnf+2FR7kAv6P4TqTqDnLfIV1kanCsRYfVoMA+VhvhwRH0H4QENna0r6qoL/P9dQ27gQv56XE90MuXW4rYWj9pT+Oy6y7uOknH0whiUqGMlbboKn3RX40okGZD0o/DehOzXCTM+s9+98XOpwE0mWcY3CySHhUSpUbNK65IbOwy5mBLV0B8LcgF8IMaazd7bQ9UeGWO1rerKR0MnNpVF7qCIrDdAlhKnzuJ/rxNBnQUNRnkEJuIMf/1mjxemK29ovzivpFT5cKT1CaLYQ==";

/**
 * 接收器配置参数
 */
export interface AcceptOptions {
   /** 密钥 */
   secret?: string;
   isAccept?: boolean;
   /** 验证用户信息，用户名和密码 */
   auth?: AcceptAuth;
   [key: string]: any;
}
/**
 * 连接器配置参数
 */
export interface ConnectOptions {
   /** 是否直接连接目标 */
   isDirect?: boolean;
   [key: string]: any;
}
/**
 * 默认实例入口配置参数
 */
export interface Options extends AcceptOptions, ConnectOptions {
   [key: string]: any;
}

/**
 * accept用户信息验证
 */
export type AcceptAuth = (username: string, password: string) => Promise<boolean>;

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
   /** 代理密钥 */
   secret?: string | Buffer;
}

/**
 * 连接用户信息
 */
export interface ConnectUser {
   username: string; //用户信息
   password: string; //密码
   args: string[]; //参数 放在密码后 password_xxx_xxx参数
}

/** 创建服务回调 */
export type CreateCallback = (server: net.Server) => void;

/**创建本地服务回调 */
//export type LocalServerCallbacck = (server: LocalTestProxyServer) => void;
