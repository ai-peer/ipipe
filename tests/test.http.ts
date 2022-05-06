import assert from "assert";
import * as com from "./tcommon";

let proxy = {
   host: "127.0.0.1",
   port: 1082,
   protocol: "http",
   username: "admin",
   password: "123",
};

let testServer;
describe("测试IPipe", async function () {
   testServer = await com.createProxyServer(proxy.port);

    it("测试http是否连接成功", () => {
      return new Promise(async (resolve) => {
         let nproxy = Object.assign({}, proxy, { protocol: "http" });
         let info = await com.requestByHttp(nproxy);
         assert.ok(info && info.length > 1, "http res is null");
         console.info("===http receive", info.slice(0, 16).toString());
         resolve(undefined);
      });
   }); 
    it("测试socks5是否连接成功", () => {
      return new Promise(async (resolve) => {
         let nproxy = Object.assign({}, proxy, { protocol: "socks5" });
         //let nproxy = {protocol: "socks5", host: "127.0.0.1", port: 9150, single: 129};
         let info = await com.requestBySocks5(nproxy);
         assert.ok(info && info.length > 1, "socks5 res is null");
         console.info("===socks5 receive", info.slice(0, 16).toString());
         resolve(undefined);
      });
   });
   it("测试light是否连接成功", () => {
      return new Promise(async (resolve) => {
         let nproxy = Object.assign({}, proxy, { protocol: "light" });
         let info = await com.requestByLight(nproxy);
         assert.ok(info && info.length > 1, "light res is null");
         console.info("===light receive", info.slice(0, 16).toString());
         resolve(undefined);
      });
   }); 
   await wait(5000);
   testServer?.close();
});

async function wait(ttl) {
   return new Promise((resolve) => {
      setTimeout(() => resolve(undefined), ttl);
   });
}
/* 
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
   //console.info("proxy ip", info);
   return info;
}
 */
