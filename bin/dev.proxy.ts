import IPipe, { LightConnect, LightAccept, password } from "../src";
import axios from "axios";
/* 
let cFileConfig = path.resolve(__dirname, "../env/config.js");
console.info("file", cFileConfig);
let configProxy = runJSFromFile(cFileConfig);
let proxyList = configProxy.getProxyList("CN", 1);
console.info("proxyList", proxyList); */
const RemotePort = 4321;
const secret = password.generateRandomPassword().toString();

async function proxyIp(proxy: { host: string; port: number }) {
   let info = await axios({
      url: "http://ip-api.com/json",
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
      .then((res) => res.data)
      .catch((err) => console.error("get proxy ip error", err.stack, err.message));
   console.info("proxy ip", info.query);
}
async function createRemoteProxy() {
   let proxy = {
      host: "127.0.0.1",
      port: 1082,
      protocol: "socks5",
      //username: "admin",
      //password: "123456",
   };

   //创建代理测试服务器
   let relayProxy = new IPipe({
      isDirect: true,
      auth: async (username, password) => {
         //return username == "admin" && password == "123456";
         return true;
      },
   });
   relayProxy.createAcceptServer(proxy.port);

   let acceptProxy = new IPipe({
      /*       auth: async (username, password) => {
         console.info("auth accept proxy", username, password);
         // return username == "admin" && password == "123456";
         return true;
      }, */
   });
   acceptProxy.on("auth", (data) => {
      // console.info("auth===", data.checked);
   });
   acceptProxy.registerAccept(new LightAccept({secret: secret}));
   acceptProxy.registerConnect(new LightConnect());
   let acceptServer = await acceptProxy.createAcceptServer(RemotePort);
   let address: any = acceptServer.address();
   console.info("accept proxy port=", RemotePort);

   acceptProxy.registerProxy(proxy);
   console.info("check proxy");

   //ipipe.on("in", (size) => console.info("in ", size));
   //ipipe.on("out", (size) => console.info("out ", size));
   //console.info("address", address);
   //myIp();
}
async function createLocalProxy() {
   let localProxy = new IPipe({
      isDirect: false,
   });

   await localProxy.createAcceptServer(1081);
   localProxy.registerProxy({
      host: "127.0.0.1",
      port: RemotePort,
      protocol: "socks5",
      secret: secret
   });
   console.info("create local proxy", 1081);
}
(async () => {
   await createRemoteProxy();
   await createLocalProxy();
   proxyIp({ host: "127.0.0.1", port: 4321 });
   let count = 0;
   while (true) {
      if (count >= 3) break;
      count++;
      //console.info("req", count);
      let res = await axios
         .request({
            url: "https://www.bing.com",
            proxy: {
               protocol: "socks5",
               host: "127.0.0.1",
               port: 1081,
            },
         })
         .then((res) => res.data)
         .catch((err) => err.message);
      //console.info("res", count, res.length);
   }
   console.info("end======");
})();
