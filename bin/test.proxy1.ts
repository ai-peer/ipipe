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
      protocol: "light",
      host:"108.166.201.94", //"127.0.0.1",//
      port: 6379, //9150,
      username: "student",
      password: "xlJZeiJA",
      secret: "ulhDOtxGGUwqvlTmioGfdPjz397WcQB/CTJHhzPN/5aJwCQmiAWDtdSNyhuz1+P5biGxgCeP9exozyC4e2LpWT5gPDXLAqm0Ecbao7stQDaTqmQoi2FvFUhnmO4ILmvdL1LCzIWXVUKUTfvJD0FexH2g93iSfDGm5Wo56gp1FsNyoa5fmZrHlR7QjP2/F0TVntgSMH55K9usHPQGqymG/vFj/B0ODJyOhCVRS1bttmzIpG1XRQS35L09OAPnwfZp0dKyAXYQkHrika8s0/pdN1MLSptcgk7w6OBlnbBbvA00qKVac+EfP62nos7ZxSNmd7lwOyJJExoYB0/r7xTyUA=="
      
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
