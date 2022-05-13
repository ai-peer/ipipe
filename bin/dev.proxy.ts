import IPipe from "../src";
import axios from "axios";

/* 
let cFileConfig = path.resolve(__dirname, "../env/config.js");
console.info("file", cFileConfig);
let configProxy = runJSFromFile(cFileConfig);
let proxyList = configProxy.getProxyList("CN", 1);
console.info("proxyList", proxyList); */

(async () => {
   let proxy = {
      host: "127.0.0.1",
      port: 1082,
      protocol: "socks5",
      username: "admin",
      password: "123456",
   };

   //创建代理测试服务器
   let relayProxy = new IPipe({
      isDirect: true,
    /*   auth: async (username, password) => {
         return username == "admin" && password == "123456";
      },  */
   });
   relayProxy.createAcceptServer(proxy.port);
   relayProxy.on("in", (data) => {
      console.info("in", data);
   });
   relayProxy.on("out", (data) => {
      console.info("out", data);
   });

   let acceptProxy = new IPipe({
      /*      auth: async (username, password) => {
         console.info("auth accept proxy", username);
         // return username == "admin" && password == "123456";
         return true;
      }, */
   });

   let acceptServer = await acceptProxy.createAcceptServer(4321);
   let address: any = acceptServer.address();

   acceptProxy.registerProxy(proxy);
   console.info("check proxy");

   //ipipe.on("in", (size) => console.info("in ", size));
   //ipipe.on("out", (size) => console.info("out ", size));
   //console.info("address", address);
   //myIp();

   proxyIp({ host: proxy.host, port: 4321 });
})();

async function myIp() {
   let info = await axios({
      url: "http://ip-api.com/json",
      timeout: 15000,
      method: "get",
   })
      .then((res) => res.data)
      .catch((err) => console.error("get proxy ip error", err.message));
   console.info("my ip", info);
}

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
