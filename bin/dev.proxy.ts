import IPipe, { LightConnect, LightAccept, password } from "../src";
import fetch from "../src/utils/fetch";
/* 
let cFileConfig = path.resolve(__dirname, "../env/config.js");
console.info("file", cFileConfig);
let configProxy = runJSFromFile(cFileConfig);
let proxyList = configProxy.getProxyList("CN", 1);
console.info("proxyList", proxyList); */
const RemotePort = 4321,
   LocalPort = 1081;
const secret = password.generateRandomPassword().toString();

async function proxyIp(proxy: { host: string; port: number }) {
   let info = await fetch({
      url: "http://icanhazip.com",
      timeout: 15000,
      method: "get",
      proxy: {
         host: proxy.host,
         port: proxy.port,
         /*          auth: {
            username: "admin",
            password: "123456",
         }, */
      },
   })
      .then((res) => res.text())
      .catch((err) => console.error("get proxy ip error", err.stack, err.message));
   console.info("get proxy ip", info);
}
async function createRemoteProxy() {
   let proxy = {
      host: "127.0.0.1",
      port: 1082,
      protocol: "socks5",
      secret: secret,
      username: "admin",
      password: "123456",
   };

   //创建代理测试服务器
   let relayProxy = new IPipe({
      isDirect: true,
      auth: async ({ username, password }) => {
         //console.info("event log auth ", username, password);
         return username == "admin" && password == "123456";
      },
   });
   await relayProxy.createAcceptServer(proxy.port);
   relayProxy.on("auth", (data) => console.info("event auth relay", data.checked));
   let acceptProxy = new IPipe({
      /*       auth: async (username, password) => {
         console.info("auth accept proxy", username, password);
         // return username == "admin" && password == "123456";
         return true;
      }, */
   });
   /*    acceptProxy.on("auth", (data) => {
      // console.info("auth===", data.checked);
   }); */
   acceptProxy.registerAccept(new LightAccept({ secret: secret }));
   //acceptProxy.registerConnect(new LightConnect());
   let acceptServer = await acceptProxy.createAcceptServer(RemotePort);
   let address: any = acceptServer.address();
   //console.info("accept proxy port=", address);

   acceptProxy.registerProxy(proxy);
   acceptProxy.on("auth", (data)=>console.info("event auth accept", data.checked));
   acceptProxy.on("accept", (data)=>console.info("event accept accept", data.protocol));
   //console.info("=============== check proxy");

   //ipipe.on("in", (size) => console.info("in ", size));
   //ipipe.on("out", (size) => console.info("out ", size));
   //console.info("address", address);
   //myIp();
}
async function createLocalProxy() {
   let localProxy = new IPipe({
      isDirect: false,
   });

   await localProxy.createAcceptServer(LocalPort);
   localProxy.registerProxy({
      host: "127.0.0.1",
      port: RemotePort,
      protocol: "http",
      secret: secret,
   });
   /*    localProxy.registerProxy({
      host: "192.168.88.1",
      port: RemotePort,
      protocol: "light",
      secret: secret,
   }); */
   localProxy.on("auth", (data) => console.info("event auth local", data.checked));
   //console.info("create local proxy", LocalPort);
   localProxy.on("request", (data) => {
      //console.info("connect=>", data.host + ":" + data.port, data.status, data.source);
   });
}
(async () => {
   await createRemoteProxy();
   await createLocalProxy();
   //proxyIp({ host: "127.0.0.1", port: 4321 });
 
  /*  let res = await fetch({
      url: "https://www.bing.com",
      timeout: 15000,
      proxy: {
         //protocol: "socks5",
         host: "127.0.0.1",
         port: 1081,
      },
   })
      .then((res) => res.text())
      .catch((err) => err.message);
   console.info("res===>", res.length, res.slice(0, 128)); */

   await proxyIp({ host: "127.0.0.1", port: LocalPort });
   console.info("end======");
   process.exit();
})();
