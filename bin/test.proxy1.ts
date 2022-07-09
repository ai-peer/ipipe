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
      //id: '2kw4vpzlzzzy',
      //createAt: 1657279564006,
      //userId: '0',
      //country: '',
      //countryCode: '',
      //city: '',
      protocol: "light",
      username: "student",
      password: "a2OOseXY",
      host: '45.77.68.61',
      port: 6379,
      secret: '9jXCyOYmV4AaG4hUt5WoqWe6/e2v2jZDMkaWg6rbz0Sm9PfqxuJR2BVuMNIRig1rfhZ0+G3EY/sFrTuhWL/wRdk3M7GrGSJc0XbyHOjFp1nOwITlmLZJhgRlMTiTi2x4AUtAaeQlCbMSwR8oDo2MfeyiVSqevBhHkKPgeoULmwDh3imdn6UjTmTpmnEGL3BKtf/dUGondfy+Oj7UybQ5F3lyE0+Oub08Kw9m6wiu+tBoUpF806QtNPP+rMPj59YM748HnHNf7stIUwMslCE/PbCBoILMYVv5XiACd817EFZ/3Mcu1d9BsmJgkvGJ9UKZTdeXHhS7TMpdbwpaJB2HuA==',
      checked: true,
      random: false,
      //status: 1,
      //lastCheckAt: 1657368982101,
      //netStatus: 'on',
      //type: 'idc',
      //protocols: [ 'light' ],
      //useTraffic: 0
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
      //console.info("out===", Date.now(), Math.ceil((tout * 1000) / 1024 / 1024) / 1000, "M", size, protocol, session, clientIp);
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
