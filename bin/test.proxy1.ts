import IPipe from "../src";
import axios from "axios";
import { Buffer } from "buffer";
/**
 * 创建本地中转转发服务
 */

async function createRelayProxyServer() {
   let ipipe = new IPipe();
   let server = await ipipe.createAcceptServer(0, "127.0.0.1");
   let acceptAddress: any = server.address();
   let acceptPort = acceptAddress.port;
   console.info("create relay server", acceptAddress);
   let forwardProxy = {
      protocol: "http",
      host: "127.0.0.1",
      port: acceptPort,
   };
   ipipe.registerProxy({
      protocol: "socks5",
      host: "127.0.0.1",
      port: 9150,
      //single: 129
   });
   for (let i = 0; i < 2; i++) await getIp(forwardProxy);
}
async function getIp(proxy: { host: string; port: number }) {
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
      .catch((err) => console.error("get proxy ip error", err.stack, err.message));
   console.info("proxy ip", info.query);
}
(async () => {
   await createRelayProxyServer();
})();
