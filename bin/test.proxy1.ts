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
      secret: "T7YShLk+H3EJc/icTVG/XKye++GCa+b82VTgpkZ6J+6dCs+LGN5KS70/TLEFifWyKmG+bJB+lwvUadVBb6T96BTidst39g2qtDWtpaOMhrchgdK7BCtahyhy/rxkumcC9PJdljnjyf+I33QBFSKvwl/WQzx5xV5Q0MNoxwbAs6nBg85gMbWuisQXkZtEjiDImfpwRS44Se3koN2oHJ/bJJWSVzTKYsZupxCF6U4dN3wlA43X0+8meztHQDDYdSzrWw8p6h5TZbA6LwyYWBEaI9yhZuczVQ7l7Bljk/CA2gdq0W3zNqs9lJqPUlYtAPfNWUj5okK4G/F4FhPMCH0yfw=="
      
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
