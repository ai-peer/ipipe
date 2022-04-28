import net from "net";
import EventEmitter from "events";
import { AcceptOptions } from './src/accept/accept';

/** 创建服务回调 */
export declare type CreateAcceptServerCallback = (server: net.Server) => void;
export declare interface Options {
    auth?: {
       username: string;
       password: string;
    };
 }
 export declare interface TestOptions {
    
       username?: string;
       password?: string;

 }
export declare class ProxyPipe<T> {
    constructor(options?: Options);
   /**
    * 创建连接接入服务
    * @param port 代理端口, 默认4321
    * @param host 代理ip, 默认0.0.0.0,代表所有ip都可以访问
    */
   createAcceptServer(port: number, host?: string, callback?: CreateAcceptServerCallback): Promise<net.Server>;
   /**
    * 创建测试代理服务, 用于测试使用
    * @param port
    * @param host
    * @param callback
    */
   createTestProxyServer(port: number, host?: string, options?: TestOptions, callback?: Function): Promise<net.Server>;

   /**
    * 注册本地接自定义接入协议， 原生支持http和socks5代理协议
    * 协议继承类Accept
    * @param accept
    */
   registerAccept(accept: Accept): this;
   /**
    * 注册连接远程代理服务器自定义协议， 原生支持http,socks5协议,forward.http http转发协议
    * 协议继承类 Connect
    * @param connect
    */
   registerConnect(connect: Connect): this;
   /**
    * 注册远程代理服务器信息
    * @param proxy
    */
   registerProxy(proxy: Proxy): this;
   /**
    * 注册直接连接的域名, 无需走代理
    * @param domain
    */
   registerDirectDomain(domain: string): this;
}

export declare type CallbackAccept = (length: number) => void;
export declare abstract class Stream extends EventEmitter {
   /**
    * 写数据
    * @param socket 网络连接socket
    * @param chunk 数据
    * @param callback 写完之后回调,并告知写子多少内容, (chunkSize: number)=>{}
    */
   write(socket: net.Socket, chunk: Buffer): Promise<Error | undefined>;
   end(socket: net.Socket, chunk: Buffer): Promise<Error | undefined>;
   read(socket: net.Socket, ttl?: number): Promise<Buffer>;
}

export declare interface AcceptOptions {
    auth?: {
       username: string;
       password: string;
    };
 }
/**
 * 接收应用端接入协议处理基类
 */
export declare abstract class Accept extends Stream {
   public protocol: string; // "http" | "https" | "socks5" | "direct";
   constructor(options? AcceptOptions);

   /**;
    * 是否可以接入， 请求的协议是否可以接入处理
    * @param socket
    * @param chunk
    */
   public abstract isAccept(socket: net.Socket, chunk: Buffer): Promise<boolean>;

   /**
    * 连接处理
    * @param socket
    * @param firstChunk
    */
   public abstract handle(socket: net.Socket, firstChunk: Buffer);
}
export declare type CallbackConnect = (error: Error | undefined, socket: net.Socket) => void;

/**
 * 连接远程代理服务器的抽象类
 */
export declare abstract class Connect extends Stream {
   /** 协议 */
   public protocol: string;
   /** 代理服务器信息 */
   public proxy: Proxy;
   constructor(options: { protocol: string });
   /**
    * 连接远程代理主机
    * @param host 目标主机ip或域名
    * @param port 目标主机端口
    * @param callback 连接成功后的回调方法
    */
   abstract connect(host: string, port: number, callback: CallbackConnect): Promise<net.Socket>;
}

export declare interface Proxy {
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

export default ProxyPipe;
