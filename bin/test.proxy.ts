//import path from "path";
//import { runJSFromFile } from "../src/utils/jsrun";
import ProxyServer from "../src/index";
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
      port: 1088,
      protocol: "http",
      username: "",
      password: "",
      //forwardHost: proxyInfo.forwardHost,
      //forwardPort: proxyInfo.forwardPort,
   };
   let proxyServer = new ProxyServer();
   proxyServer.createLocalProxyServer(1088, "0.0.0.0");
   let server = await proxyServer.createAcceptServer(0);
   let address: any = server.address();
   proxyServer.registerProxy(proxy);
   console.info("address", address);
   myIp();
   proxyIp({ host: proxy.host, port: proxy.port });
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
      },
   })
      .then((res) => res.data)
      .catch((err) => console.error("get proxy ip error", err.message));
   console.info("proxy ip", info);
}
