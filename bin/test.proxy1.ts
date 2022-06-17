import IPipe from "../src";
import axios from "axios";
import { Buffer } from "buffer";
/**
 * 创建本地中转转发服务
 */

async function createRelayProxyServer() {
   let ipipe = new IPipe();
   let server = await ipipe.createAcceptServer(1081, "127.0.0.1");
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
      host:"127.0.0.1",//"108.166.201.94",
      port: 4321, //9150,
      username: "student",
      password: "xlJZeiJA",
      secret: "DIURKLVdaxDETkrQAbKlYPon1tvePVxbCzFfHOh0OvxDD2cZtKDlsYk5AF7Mecf92PI3lFGPFwPR6peKQjO3Vd1zcJZvfQJP42WBvkgH6Rr/OMp8frn2yOeapozXkKmDcYIKz5xQ89IhJW3AkR6TIMWePgRoJtUkU6jmafWjI6Ip+GwbE2M2QGbDxs52ttoOV4Cn2WEWWap4L/GVre7TeqyHrvRqH1ZG93WOy9QtNOIVvZnvUkXkmNxLr7P74TBBIh27CW6kKryNOxL5K2TgLvC6VJvfhKtEuO0Iwf7Je50yoX9YvwYFSQ0YPEcU7EyfP4awd+s1TVrCzSxyiGKSiw=="
      
      //single: 129
   });
   ipipe.setTimeout(60 * 1000);
   let tsize = 0,
      tout = 0;
   ipipe.on("in", ({ size, protocol, session, clientIp }) => {
      tsize += size;
      //console.info("in===", Math.ceil(tsize*1000/1024/1024)/1000, "M", size, protocol, session, clientIp);
   });
   ipipe.on("out", ({ size, protocol, session, clientIp }) => {
      tout += size;
      console.info("out===", Date.now(), Math.ceil((tout * 1000) / 1024 / 1024) / 1000, "M", size, protocol, session, clientIp);
   });
   //for (let i = 0; i < 2; i++) await getIp(forwardProxy);
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
