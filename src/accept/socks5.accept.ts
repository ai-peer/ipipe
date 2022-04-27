import Accept from "./accept";
import net from "net";
import { parseSocks5IpPort, isIpv4, isIpv6, isDomain } from "../core/geoip";

/**
 * socks5协议接入类
 */
export default class Socks5Accept extends Accept {
   constructor() {
      super();
      this.protocol = "socks5";
   }

   public async isAccept(socket: net.Socket, chunk: Buffer): Promise<boolean> {
      return this.isSocks5(chunk);
   }
   public async handle(socket: net.Socket, chunk: Buffer) {
      /** 解析首次 socks5 请求协议获取反馈和主机信息 start */

      let _this = this;
      let isReadTargetInfo = false;
      setTimeout(() => {
         if (!isReadTargetInfo) {
            socket.destroy(new Error("本地接入网络超时"));
         }
      }, 1000);
      /** 三步走 start */
      await _this.write(socket, Buffer.from([0x05, 0x00])); //响应客户端连接
      let targetInfoBuffer = await _this.read(socket); //读取将要建立连接的目标服务,
      isReadTargetInfo = true;
      let { host, port, atyp } = parseSocks5IpPort(targetInfoBuffer); //读取将要建立连接的目标服务
      let isUseV4 = atyp == 0x01 && isIpv4(host);
      let isUseV6 = atyp == 0x04 && isIpv6(host);
      let isUseDomain = atyp == 0x03 && (isIpv4(host) || isDomain(host));
      if (!(isUseV4 || isUseV6 || isUseDomain)) {
         //数据错误, 解析不到要访问的域名
         console.error("解析访问的域名出错", atyp, host, [...targetInfoBuffer]);
         await _this.end(socket, Buffer.from([0x05, 0x04, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00])); //返回告诉
         return false;
      }
      //await _this.write(socket, Buffer.from([0x05, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00])); //返回告诉
      await _this.write(socket, Buffer.from([0x05, 0x00, 0x00, ...targetInfoBuffer.slice(3)])); //返回告诉
      //await _this.write(socket, Buffer.concat([Buffer.from([0x05, 0x00, 0x00]), targetInfoBuffer.slice(3)])); //返回告诉
      /** 三步走 end */
      let sendData = await _this.read(socket, 500);
      /** 解析首次 socks5 请求协议获取反馈和主机信息 end */

      this.connect(host, port, socket, sendData);
   }

   private isSocks5(buffer: Buffer): boolean {
      if (buffer[0] == 5 && [1, 2, 3, 4, 5].includes(buffer[1]) && buffer[2] == 0) {
         return true;
      }
      return false;
   }
}
