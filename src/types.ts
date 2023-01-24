import net from "net";

export const DefaultSecret =
   "lOfGpnn7nZ7KODmxUckw4GhMY95vA/LvlnMcbjNZ9hapILXX20KAClDxB8QjCUElRHfZhrgnf+2FR7kAv6P4TqTqDnLfIV1kanCsRYfVoMA+VhvhwRH0H4QENna0r6qoL/P9dQ27gQv56XE90MuXW4rYWj9pT+Oy6y7uOknH0whiUqGMlbboKn3RX40okGZD0o/DehOzXCTM+s9+98XOpwE0mWcY3CySHhUSpUbNK65IbOwy5mBLV0B8LcgF8IMaazd7bQ9UeGWO1rerKR0MnNpVF7qCIrDdAlhKnzuJ/rxNBnQUNRnkEJuIMf/1mjxemK29ovzivpFT5cKT1CaLYQ==";

export enum CMD {
   /** 心跳检测 */
   HEARTBEAT = 0,
   /** 连接关闭指令 */
   CLOSE = 1,
}

export type ReadData = {
   size: number;
   session: string;
   clientIp: string;
   protocol: string;
   chunk: any;
   //type: "connect" | "accept";
};
export type WriteData = {
   size: number;
   session: string;
   clientIp: string;
   protocol: string;
   chunk: any;
   //type: "connect" | "accept";
};
export type AuthData = {
   checked: boolean;
   username: string;
   password: string;
   session: string;
   clientIp: string;
   type: "connect" | "accept";
   args: any[];
   //[key: string]: any;
};
export type AcceptData = {
   socket: net.Socket;
   protocol: string;
};
/**
 * 接收器配置参数
 */
export type AcceptOptions = {
   peerId?: string;
   /** 密钥 */
   secret?: string;
   /** 是否接入,默认true */
   isAccept?: boolean;
   /** 验证用户信息，用户名和密码 */
   auth?: AcceptAuthData;
   /** 是否直接连接目标服务, 代理终点 */
   isDirect?: boolean;
   //[key: string]: any;
};
/**
 * 连接器配置参数
 */
export type ConnectOptions = {
   /** 是否直接连接目标 */
   isDirect?: boolean;
   protocol?: string;
   peerId?: string;
   //[key: string]: any;
};
/**
 * 默认实例入口配置参数
 */
export type Options = AcceptOptions &
   ConnectOptions & {
      [key: string]: any;
   };

/**
 * accept用户信息验证
 */
export type AcceptAuthData = (data: {
   username: string;
   password: string; //
   //socket: net.Socket;
   protocol: string;
   args: string[];
   session: string;
   clientIp: string;
}) => Promise<boolean>;

/**
 * 代理模式
 * 0=session模式， 1=随机ip模式， 2=固定模式（未实现）
 */
export enum ProxyMode {
   /**
    * session模式,一段时间内ip稳定
    */
   session = 0,
   /**
    * 随机模式,每次请求变更ip
    */
   random = 1,
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
   /** 转发主机,转发到代理  */
   forward?: {
      host: string;
      port: number;
      /** 用户名 */
      username?: string;
      /** 密码 */
      password?: string;
   };
   /** 代理密钥 */
   secret?: string | Buffer;
   /** 代理检测好坏，内部使用 */
   checked?: boolean;
   /** 使用模式 0=session模式， 1=随机ip模式， 2=固定模式（未实现） */
   mode?: ProxyMode;
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
