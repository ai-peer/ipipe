import IPipe from "../src";
import axios from "axios";
import { Buffer } from "buffer";
/**
 * 创建本地中转转发服务
 */

async function createRelayProxyServer() {
   let ipipe = new IPipe();
   let server = await ipipe.createAcceptServer(1082, "127.0.0.1");
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
      port: 4321, //9150,
      username: "student",
      password: "xlJZeiJA",
      secret: "g8LUlL1l01VGO+A/TT1XyAucb9dEUuilOBgmPFZ74k9LDUHu/wZ6NSGs8T6utR8BmCnPnrI3nYtuzrQH9UrB3nT3EXNFknlIMnAvn9zmHJOIp/KxBH46IvaXD10q70fL29ZOps3HxnZ9JN3ANGgSYAqGWpX+hA70KB3MHiv8TCPJapYWACWOJ9m4Yb+a2OujWeWKbeMME3WQM14ajeyJZjHhWPjVUdBjFRDzSa+58Lyz6rr5rS056f2RfDZiG5sIsPouCVNQ5Gt/cqmCQGcsQoUF58Npd4FxttFDqyC7W75UxaoXZNKkgI+M2gKhGXjEXO2oA6KHX99stzDKmaAU+w=="
      
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
}/* 
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
} */
(async () => {
   await createRelayProxyServer();
})();
