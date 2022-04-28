import { Command } from "commander";
import ProxyPipe from "../src";

const program = new Command();
let appParams: any = program //
   .option("-p, --port [value]", "绑定端口", "6379") //
   .option("-h, --host [value]", "绑定IP", "0.0.0.0") //
   .option("-p2, --port2 [value]", "代理端口", "6379") //
   .option("-h2, --host2 [value]", "代理IP", "0.0.0.0") //
   .option("-user, --username [value]", "用户名", "") //
   .option("-pass, --password [value]", "密码", "") //
   .option("-user2, --username2 [value]", "用户名", "") //
   .option("-pass2, --password2 [value]", "密码", "") //
   .option("-protocol, --protocol [value]", "协议", "http") //
   .option("-m, --mode [value]", "模式 server, client, relay", "client") //
   .parse(process.argv)
   .opts();

async function createRelay() {
   console.info("======createRelay");
   let proxy = {
      host: appParams.host2,
      port: appParams.port2,
      protocol: appParams.protocol,
      username: appParams.username2,
      password: appParams.password2,
   };
   let proxyPipe = new ProxyPipe({
      isDirect: false,
      auth: {
         username: appParams.username,
         password: appParams.password,
      },
   });
   await proxyPipe.createAcceptServer(appParams.port, appParams.host);
   proxyPipe.registerProxy(proxy);

   proxyPipe.on("in", (size) => console.info("relay in", size));
   proxyPipe.on("out", (size) => console.info("relay out", size));
}
async function createServer() {
   console.info("======createServer");
   let proxyPipe = new ProxyPipe({
      isDirect: true,
      auth: {
         username: appParams.username,
         password: appParams.password,
      },
   });
   await proxyPipe.createAcceptServer(appParams.port, appParams.host);
   proxyPipe.on("in", (size) => console.info("server in", size));
   proxyPipe.on("out", (size) => console.info("server out", size));
}
async function createClient() {
   console.info("======createClient");
   let proxy = {
      host: appParams.host2,
      port: appParams.port2,
      protocol: appParams.protocol,
      username: appParams.username,
      password: appParams.password,
   };
   let proxyPipe = new ProxyPipe({});

   /*   await proxyPipe.createTestProxyServer(proxy.port, "0.0.0.0", {
      //username: "admin",
      //password: "123456",
   }); */

   await proxyPipe.createAcceptServer(appParams.port, appParams.host);

   proxyPipe.registerProxy(proxy);

   proxyPipe.on("in", (size) => console.info("client in", size));
   proxyPipe.on("out", (size) => console.info("client out", size));
}

(async () => {
   let mode = appParams.mode;
   if (mode == "server") {
      createServer();
   } else if (mode == "relay") {
      createRelay();
   } else {
      createClient();
   }
})();
