import { Command } from "commander";
import ProxyServer from "../src";

const program = new Command();
let appParams: any = program //
   .option("-p, --port [value]", "绑定本地端口", "1080") //
   .option("-h, --host [value]", "绑定本地IP", "0.0.0.0") //
   .option("-pp, --proxyPort [value]", "绑定代理端口") //
   .option("-ph, --proxyHost [value]", "绑定代理IP") //
   .option("-user, --username [value]", "用户名", "") //
   .option("-pass, --password [value]", "密码", "") //
   .option("-protocol, --protocol [value]", "协议", "http") //
   .parse(process.argv)
   .opts();

(async () => {
   let proxy = {
      host: appParams.proxyHost,
      port: appParams.proxyPort,
      protocol: appParams.protocol,
      username: appParams.username,
      password: appParams.password,
      //forwardHost: "127.0.0.1",
      //forwardPort: 1082,
   };
   let proxyServer = new ProxyServer({
      //isDirect: false,
   });

   await proxyServer.createTestProxyServer(proxy.port, "0.0.0.0", {
      //username: "admin",
      //password: "123456",
   });

   await proxyServer.createAcceptServer(4321);
   //let address: any = acceptServer.address();

   proxyServer.registerProxy(proxy);
})();
