/**
 * socks5协议生成和解析
 */
import { ProxyMode } from "../../types";
import { buildSN } from "../../core/password";

/**
 * 发送生成用户认证的数据
 * @param data
 */
export function sendAuth(data: { mode: ProxyMode; username: string; password: string }) {
   let password = Buffer.from(
      data.mode == 1
         ? data.password + "_" + data.mode + "_" + buildSN(6) //
         : data.password + "_" + data.mode,
   );
   let bUsername = Buffer.from(data.username);
   let chunk = Buffer.concat([
      Buffer.from([0x01]),
      Buffer.from([bUsername.byteLength]),
      bUsername, //
      Buffer.from([password.byteLength]),
      password,
   ]);
   return chunk;
}
