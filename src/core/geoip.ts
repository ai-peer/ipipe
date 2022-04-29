import dns from "dns";
import net from "net";
import fetch from "axios";

const G_IPS: Array<string> = [];
function anyPromise(array: Array<Promise<any>>): Promise<any> {
   return new Promise((resolve, reject) => {
      let retValue;
      array.forEach(async (p: Promise<any>) => {
         let value = await p.then((r) => r).catch((e) => {});
         if (!!retValue) return;
         if (value != undefined || value != null) {
            retValue = value;
            resolve(value);
         }
      });
   });
}

export async function getAllIPs(): Promise<Array<string>> {
   if (G_IPS.length > 0) {
      return G_IPS;
   }
   const os = require("os");
   //const osType = os.type(); //系统类型
   //let s1 = await getPublicIpFromIPIP();
   let pip = await anyPromise([getPublicIpFromIfconfigMe(), getPublicIpFromMyip(), getPublicIpFromIPIP()]);
   const netInfo = os.networkInterfaces(); //网络信息
   for (let key in netInfo) {
      (netInfo[key] || []).forEach((item) => {
         if (/([\d]{1,3}\.)([\d]{1,3})/.test(item.address)) {
            G_IPS.push(item.address);
         }
      });
   }
   G_IPS.findIndex((ip) => ip == pip) < 0 && G_IPS.push(pip);
   return G_IPS;
}
async function getPublicIpFromIfconfigMe() {
   return fetch
      .get("https://ifconfig.me/all.json")
      .then((res) => res.data)
      .then((res) => res?.ip_addr)
      .catch((err) => {});
}
async function getPublicIpFromMyip() {
   return fetch
      .get("https://api.myip.com")
      .then((res) => res.data)
      .then((res) => res?.ip)
      .catch((err) => {});
}
//
async function getPublicIpFromIPIP() {
   return fetch
      .get("http://myip.ipip.net/json")
      .then((res) => res.data)
      .then((res) => (res?.ret === "ok" ? res?.data?.ip : undefined))
      .catch((err) => {});
}
/**
 * 是否是公网ip
 * @param ip
 */

export function isPublicIp(ip) {
   ip = (ip || "").replace(/:\d+$/, "");
   if (/^localhost$/.test(ip)) return false;
   if (/^127\.0\.0\.1$/.test(ip)) return false;
   if (/^(0|10|127)\..*$/.test(ip)) return false;
   if (/^(100|169|172|192|198|203|204|240|255)\./.test(ip)) {
      let ls = ip.split(".");
      let l1 = parseInt(ls[0]),
         l2 = parseInt(ls[1]),
         l3 = parseInt(ls[2]);
      switch (l1) {
         case 100:
            return l2 < 64 || l2 > 127;
         case 169:
            return l2 != 254;
         case 172:
            return l2 < 16 || l2 > 31;
         case 192:
            switch (l2) {
               case 0:
                  return l3 != 2;
               case 88:
                  return l3 != 99;
               case 168:
                  return false;
            }
         case 198:
            switch (l2) {
               case 18:
               case 19:
                  return false;
               case 51:
                  return l3 != 100;
            }
         case 203:
            return l2 != 0 && l3 != 113;
      }
      if (l1 >= 224 && l1 <= 239) return false;
      if (l1 >= 240) return false;
   }
   return true;
}
let G_PUBLIC_IP = "";

export async function getPublicIp(): Promise<string> {
   if (G_PUBLIC_IP) return G_PUBLIC_IP;
   let ips = await getAllIPs();
   ips = ips.filter((ip: string) => isPublicIp(ip));
   G_PUBLIC_IP = ips.length > 0 ? ips[0] : "";
   //console.info("getPublicIp", G_PUBLIC_IP);
   return G_PUBLIC_IP;
}
export async function getLocalIps(): Promise<string[]> {
   let ips = await getAllIPs();
   return ips.filter((v) => !isPublicIp(v));
}

export async function isInLocalIp(ip) {
   ip = (ip || "").replace(/(^https?:\/\/)|(:\d+.*$)/g, "");
   if (!net.isIPv4(ip) && /^([a-z0-9_-]+\.)+([a-z0-9_-]+)$/i.test(ip)) {
      let res = await dns.promises.lookup(ip, {}).catch((err) => undefined);
      if (!res) return false;
      ip = res.address;
   }
   let ips = await getAllIPs();
   return ips.findIndex((lip) => lip == ip) >= 0;
}
export async function isLocalNetwork(ip) {
   let s1 = await isInLocalIp(ip);
   if (s1) return true;
   return /^((192\.168)|(172\.16)|(10))\./i.test(ip);
}

export function trimAddress(addr) {
   addr = (addr || "")
      .trim()
      .replace(
         /\u0000|\u0001|\u0002|\u0003|\u0004|\u0005|\u0006|\u0007|\u0008|\u0009|\u000a|\u000b|\u000c|\u000d|\u000e|\u000f|\u0010|\u0011|\u0012|\u0013|\u0014|\u0015|\u0016|\u0017|\u0018|\u0019|\u001a|\u001b|\u001c|\u001d|\u001e|\u001f/g,
         "",
      );
   return addr.replace(/^[^a-z0-9]+/gi, "");
}

export function validSocks5Target(socket: net.Socket, { host, port, atyp }): boolean {
   /*    if (![1, 3, 4].includes(atyp)) {
      socket.destroy(new Error("atype 错误"));
      return false;
   }
   if (!(0 < port && Math.pow(2, 16) > port)) {
      socket.destroy(new Error("port 错误"));
      return false;
   } */
   let isUseV4 = atyp == 0x01 && isIpv4(host);
   let isUseV6 = atyp == 0x04 && isIpv6(host);
   let isUseDomain = atyp == 0x03 && (isIpv4(host) || isDomain(host));
   if (!(isUseV4 || isUseV6 || isUseDomain)) {
      //数据错误, 解析不到要访问的域名
      socket.destroy(new Error("atype 错误"));
      return false;
   }
   if (net.isIPv4(host) || net.isIPv6(host) || isDomain(host)) {
      return true;
   }
   return false;
}
export function parseSocks5IpPort(chunk: Buffer): { host: string; port: number; atyp: number } {
   if (!chunk) return { host: "", port: 0, atyp: 0 };
   let buf = [...chunk];
   let atyp = buf[3];
   let remote, port;
   port = parseInt("0x" + Buffer.from(buf.slice(buf.length - 2)).toString("hex"), 16);
   remote = buf.slice(4, buf.length - 2).join("."); //ipv4
   if (isIpv4(remote)) atyp = 1;
   if (atyp == 1) remote = buf.slice(4, buf.length - 2).join(".");
   //ipv4
   else if (atyp == 3) {
      remote = String.fromCharCode(...buf.slice(4, buf.length - 2)); //域名
   } else if (atyp == 4) {
      //ipv6
      let as: Array<string> = [];
      buf.slice(4, buf.length - 2)
         .map((i) => Buffer.from([i]).toString("hex"))
         .forEach((v, i) => {
            if (i % 2 == 0) as.push(v);
            else {
               let t = as[as.length - 1] + v;
               as[as.length - 1] = String(parseInt(t, 16));
            }
         });
      remote = as.join(":").replace(/(0:)+/, "::");
   }
   remote = trimAddress(remote);
   return { host: remote, port: port, atyp };
} /* 
export function parseHttpHeaders(chunk: Buffer) {
   if (chunk[0] < 65 || chunk[0] > 122) {
      return {};
   }
   let lines = (chunk.toString() || "").split("\n").map((v) => v.trim());
   let headers = {};
   for (let i = 0; i < lines.length; i++) {
      let v = lines[i];
      if (v.trim() == "") break;
      if (i == 0) {
         if (/^CONNECT/.test(v)) {
            let line = v.replace(/^[^ ]* /, "").replace(/ .*$/, "");
            let hp = line.split(":");
            headers["protocol"] = "https";
            headers["hport"] = parseInt(hp[1]) || 443;
            headers["hhost"] = hp[0];
         } else {
            let line = v.replace(/^.*:\/\//, "").replace(/(\/.*)|( .*)$/, "");
            let hp = line.split(":");
            headers["protocol"] = "http";
            headers["hport"] = parseInt(hp[1]) || 80;
            headers["hhost"] = hp[0];
         }
      } else {
         let kv = v.split(":");
         headers[kv[0].toLowerCase()] = kv[1];
      }
   }
   lines.forEach((v, i) => {});
   return headers;
} */
export function isDomain(value: string) {
   return /^([a-z0-9_-]+\.)+[a-z]+$/i.test((value || "").trim());
}
export function isIpv4(value: string) {
   //return /^([0-9]{1,3}\.){3}[0-9]{1,3}$/i.test((value || "").trim());
   return net.isIPv4(value);
}
export function isIpv6(value: string) {
   //return /^([0-9]{1,3}\.){3}[0-9]{1,3}$/i.test((value || "").trim());
   return net.isIPv6(value);
}
