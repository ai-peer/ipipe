/**
 * 单线程模式
 */
import { Command } from "commander";
import * as check from "../src/utils/check";
const program = new Command();
let appParams: any = program //
   .option("-host, --host [value]", "代理主机", "127.0.0.1") //
   .option("-port, --port [value]", "代理端口", "1080") //
   .option("-secret, --secret [value]", "密钥", "")
   .option("-u, --username [value]", "用户", "") //
   .option("-p, --password [value]", "密码", "") //
   .option("-protocol, --protocol [value]", "密码", "socks5") //
   .parse(process.argv)
   .opts();

console.info("args", appParams);
(async () => {
   let checked = await check.check(appParams).catch((err) => {
      console.info("check proxyn error", err.message);
      return false;
   });
   console.info("check proxy", checked);
})();
