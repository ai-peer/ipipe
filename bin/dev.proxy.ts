import IPipe, { LightConnect, LightAccept, password } from "../src";
import fetch from "../src/utils/fetch";
/* 
let cFileConfig = path.resolve(__dirname, "../env/config.js");
console.info("file", cFileConfig);
let configProxy = runJSFromFile(cFileConfig);
let proxyList = configProxy.getProxyList("CN", 1);
console.info("proxyList", proxyList); */
const RemotePort = 4322,
   LocalPort = 4321;
const secret = password.generateRandomPassword().toString();

async function proxyIp(proxy: { host: string; port: number }) {
   let info = await fetch({
      url: "http://icanhazip.com",
      timeout: 15000,
      method: "get",
      proxy: {
         host: proxy.host,
         port: proxy.port,
         auth: {
            username: "admin",
            password: "1234567",
         },
      },
   })
      .then((res) => res.text())
      .catch((err) => console.error("get proxy ip error", err.stack, err.message));
   console.info("get proxy ip", info);
}
async function createRemoteProxy() {
   let proxy = {
      host: "127.0.0.1",
      port: RemotePort,
      protocol: "http",
      username: "admin",
      password: "123456",
   };

   //创建代理测试服务器
   let targetProxy = new IPipe({
      isDirect: true,
      auth: async (data) => {
         //console.info("event log target auth ", data.username, data.password);
         return data.username == "admin" && data.password == "123456";
      },
   });
   await targetProxy.createAcceptServer(proxy.port);
   //targetProxy.on("auth", (data) => console.info("event auth target", data.checked));

   let localProxy = new IPipe({
      isDirect: false,
      auth: async ({ username, password }) => {
         return username == "admin" && password == "1234567";
      },
   });
   await localProxy.createAcceptServer(LocalPort);
   localProxy.registerProxy(proxy);
   localProxy.on("auth", (data) => console.info("event auth local", data.type, data.checked, data.username, data.password));
   //console.info("create local proxy", LocalPort);
   localProxy.on("request", (data) => {
      //console.info("connect=>", data.host + ":" + data.port, data.status, data.source);
   });
}

(async () => {
   await createRemoteProxy();
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
