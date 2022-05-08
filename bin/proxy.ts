import { Command } from "commander";
import IPipe from "../src";
import * as password from "../src/core/password";

const program = new Command();
let appParams: any = program //
   .option("-p, --port [value]", "绑定端口", "4321") //
   .option("-h, --host [value]", "绑定IP", "0.0.0.0") //
   .option("-p2, --port2 [value]", "代理端口", "") //
   .option("-h2, --host2 [value]", "代理IP", "127.0.0.1") //
   .option("-user, --username [value]", "用户名", "") //
   .option("-pass, --password [value]", "密码", "") //
   .option("-user2, --username2 [value]", "用户名", "") //
   .option("-pass2, --password2 [value]", "密码", "") //
   .option("-protocol, --protocol [value]", "协议", "http") //
   .option("-m, --mode [value]", "模式 server, client, relay", "client") //
   .option("-protocol, --protocol", "接入协议", "http,socks5,light")
   .option("-secret, --secret", "自定义密钥", "")
   .option("-buildSecret, --buildSecret", "创建密钥", false)
   .parse(process.argv)
   .opts();



/**
 * 创建中继
 */
async function createRelay() {
   let proxy = {
      host: appParams.host2,
      port: appParams.port2,
      protocol: appParams.protocol,
      username: appParams.username2,
      password: appParams.password2,
   };
   let ipipe = new IPipe({
      isDirect: false,
      auth: async (username, password) => {
         return username == appParams.username && password == appParams.password;
      },
   });
   await ipipe.createAcceptServer(appParams.port, appParams.host);
   ipipe.registerProxy(proxy);

   ipipe.on("in", (size) => console.info("relay in", size));
   ipipe.on("out", (size) => console.info("relay out", size));
}
/**
 * 创建服务
 */
async function createServer() {
   console.info("======createServer");
   let ipipe = new IPipe({
      isDirect: true,
      auth: async (username, password) => {
         return username == appParams.username && password == appParams.password;
      },
   });
   await ipipe.createAcceptServer(appParams.port, appParams.host);
   ipipe.on("in", (size) => console.info("server in", size));
   ipipe.on("out", (size) => console.info("server out", size));
}
/**
 * 创建客户端
 */
async function createClient() {
   console.info("======createClient");
   let proxy = {
      host: appParams.host2,
      port: appParams.port2,
      protocol: appParams.protocol,
      username: appParams.username,
      password: appParams.password,
   };
   let ipipe = new IPipe({
      auth: async (username, password) => {
         return username == appParams.username && password == appParams.password;
      },
   });

   /*   await proxyPipe.createTestProxyServer(proxy.port, "0.0.0.0", {
      //username: "admin",
      //password: "123456",
   }); */

   await ipipe.createAcceptServer(appParams.port, appParams.host);

   ipipe.registerProxy(proxy);
   ipipe.on("in", (size) => console.info("client in", size));
   ipipe.on("out", (size) => console.info("client out", size));
   //proxyPipe.on("in", (size) => console.info("client in", size));
   //proxyPipe.on("out", (size) => console.info("client out", size));
}

(async () => {
   if(appParams.buildSecret){//打印输出新密钥
      let secret = password.generateRandomPassword(true);
      console.info("secret:", secret);
      return;
   }


   let mode = appParams.mode;
   if (mode == "server") {
      createServer();
   } else if (mode == "relay") {
      createRelay();
   } else {
      createClient();
   }
})();
