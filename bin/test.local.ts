import axios from "axios";
import IPipe, { LightConnect, LightAccept, password } from "../src";
import { AddressInfo } from "net";
import net from "net";

export default async function create(port: number = 4321) {
   //step1
   //===== 创建接入客户端， 默认可以通过http和socks5协议接入代理
   const ipipe = new IPipe(); //初始化实例
   await ipipe.createAcceptServer(port); //创建接入服务kk, 4321 端口是本地接入的端口
   /*  ipipe.registerProxy({
      protocol: config.proxy.protocol,
      host: config.proxy.host,
      port: config.proxy.port,
   });  */ //注册代理服务器

   //step2 可以跳过, 这里是模拟目标代理服务器
   const ipipe2 = new IPipe({
      isDirect: true, //不能少这个参数
      auth: async () => {
         return true;
      },
   }); //初始化实例
   let server = await ipipe2.createAcceptServer(0, "127.0.0.1"); //创建接入服务 */
   let address = <AddressInfo>server.address();
   console.info("server", address);

   ipipe.registerProxy({
      protocol: "socks5",
      host: "127.0.0.1",
      port: address.port,
      //username: "u-" + Math.random().toString(36).slice(2),
      //password: "",
   });

   console.info("proxys", ipipe.getProxys());
}

async function testProxy(proxy: { host: string; port: number }) {
   let info = await axios({
      //url: "https://www.ifconfig.me/all.json",
      //url: "http://ip-api.com/json",
      url: "http://www.gov.cn/",
      //url: "https://hoho.tv/vod/detail/id/188303.html",
      timeout: 15000,
      method: "get",
      proxy: {
         host: proxy.host,
         port: proxy.port,
       /*   auth: {
            username: "u-" + Math.random().toString(36).slice(2),
            password: "",
         }, */
      },
   })
      .then((res) => res.data)
      .catch((err) => console.error("get proxy ip error", err.stack, err.message));
   console.info("proxy ip", info.substring(1, 120));
}
function connect() {
   let socket = net.connect(80, "www.ip-api.com");
   socket.on("data", (data) => {
      console.info("data", data.slice(0, 12).toString());
   });
   socket.on("error", (err) => {
      console.info("error====>", err);
   });
   let send: string[] = [
      "GET http://www.ip-api.com/json HTTP/1.1", //
      "Accept: application/json, text/plain, */*",
      "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.127 Safari/537.36",
      "host: www.ip-api.com",
      "Connection: close",
      "\r\n",
   ];
   let sendx = [
      "GET http://www.gov.cn/ HTTP/1.1", //
      "Accept: application/json, text/plain, */*",
      "User-Agent: axios/0.25.0",
      "host: www.gov.cn",
      "Connection: close",
      "\r\n",
   ];
   console.info("...", send.join("\r\n"));
   socket.write(send.join("\r\n"));
}
(async () => {
   const port = 4321;
   //connect();
   await create(port);
   await testProxy({ host: "127.0.0.1", port: port });
})();
