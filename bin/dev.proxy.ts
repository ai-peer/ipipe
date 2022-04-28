import ProxyServer from "../src";
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
      protocol: "http",
      //username: "admin",
      //password: "123456",
      //forwardHost: "127.0.0.1",
      //forwardPort: 1082,
   };
   let proxyServer = new ProxyServer({
      //isDirect: true,
      auth: {
         username: "admin",
         password: "123456",
      },
   });

   await proxyServer.createTestProxyServer(proxy.port, "0.0.0.0", {
      //username: "admin",
      //password: "123456",
   });

   let acceptServer = await proxyServer.createAcceptServer(4321);
   let address: any = acceptServer.address();

   proxyServer.registerProxy(proxy);

   proxyServer.on("in", (size) => console.info("in ", size));
   proxyServer.on("out", (size) => console.info("out ", size));
   //console.info("address", address);
   //myIp();
   proxyIp({ host: proxy.host, port: address.port });
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
         auth: {
            username: "admin",
            password: "123456",
         },
      },
   })
      .then((res) => res.data)
      .catch((err) => console.error("get proxy ip error", err.stack, err.message));
   console.info("proxy ip", info);
}
