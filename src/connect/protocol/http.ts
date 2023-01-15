import { ConnectUser, ProxyMode } from "../../types";
import { buildSN } from "../../core/password";
/**
 * 分隔密码格式: 用 _分隔
 * 组成格式: password_x1_x2_x3_...
 */
function splitHttpPassword(str: string): { password: string; args: string[] } {
   let ss = str.split("_");
   return {
      password: ss[0] || "",
      args: ss.slice(1) || [],
   };
}
/**
 * 解析http协议的认证数据,转为用户对象
 * @param authorization
 */
export function parseHttpUser(authorization: string): ConnectUser {
   try {
      authorization = authorization || "";
      let kv = authorization.trim().split(" ")[1] || "";
      let buf = Buffer.from(kv, "base64");
      let kvs = buf.toString().split(":");
      let username = kvs[0] || "",
         password = kvs[1] || "";
      let pps = splitHttpPassword(password);
      return {
         username: username || "",
         password: pps.password || "",
         args: pps.args || [],
      };
   } catch (err) {
      return {
         username: "",
         password: "",
         args: [],
      };
   }
}
/**
 * 生成基于http协议代理的用户认证密钥信息
 * @param proxy
 */
export function buildHttpProxyAuth(proxy: { mode: ProxyMode; username: string; password: string }) {
   let pwd = proxy.password || "";
   pwd = proxy.mode == 1 ? pwd + "_" + proxy.mode + "_" + buildSN(6) : pwd + "_" + proxy.mode;
   let up = proxy.username + ":" + pwd;
   return up;
}

/**
 * 创建http初始连接 带用户/密码
 * @param proxy
 */
export function buildConnectChunk(proxy: { mode: ProxyMode; host: string; port: number; username?: string; password?: string }) {
   let isAuth = !!proxy.username;
   let authChunk = Buffer.from(
      buildHttpProxyAuth({
         mode: proxy.mode, //
         username: proxy.username || "",
         password: proxy.password || "",
      }),
   ).toString("base64");

   let chunk = Buffer.concat([
      Buffer.from(`CONNECT ${proxy.host}:${proxy.port} HTTP/1.1\r\n`), //
      Buffer.from(`Host: ${proxy.host}:${proxy.port}\r\n`), //
      Buffer.from(`Proxy-Connection: keep-alive\r\n`), //
      Buffer.from(isAuth ? `Proxy-Authorization: Basic ${authChunk}\r\n` : ""),
      Buffer.from("\r\n"),
   ]);
   return chunk;
}
