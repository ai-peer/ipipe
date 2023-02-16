import * as com from "./tcommon";

let proxy = {
   host: "127.0.0.1",
   port: 1082,
   protocol: "http",
   username: "admin",
   password: "123",
   random: true,
};

let testServer;
describe("测试IPipe", async function () {
   testServer = await com.createProxyServer(proxy.port);
   console.info("start test================");
   //await wait(2000);
   it("测试light是否连接成功", () => {
      return new Promise(async (resolve) => {
         let nproxy = Object.assign({}, proxy, { protocol: "light" });
         await com.requestByLight(nproxy);
         resolve(undefined);
      });
   });
   it("测试http是否连接成功", () => {
      return new Promise(async (resolve) => {
         let nproxy = Object.assign({}, proxy, { protocol: "http" });
         let info = await com.requestByHttp(nproxy);
         //assert.ok(info && info.length > 1, "http res is null");
         //console.info("===http receive", info.length, [...info].slice(0, 16), info.slice(0, 16).toString());
         resolve(undefined);
      });
   });
   it("测试socks5是否连接成功", () => {
      return new Promise(async (resolve) => {
         let nproxy = Object.assign({}, proxy, { protocol: "socks5" });
         await com.requestBySocks5(nproxy);
         resolve(undefined);
      });
   });
   /*    it("测试http.forward是否连接成功", () => {
      return new Promise(async (resolve) => {
         let nproxy = Object.assign({}, proxy, { protocol: "forward.http", forwardHost: "127.0.0.1", forwardPort: 9999 });
         //let nproxy = {protocol: "socks5", host: "127.0.0.1", port: 9150, single: 129};
         let info = await com.requestByForwardHttp(nproxy);
         assert.ok(info && info.length > 1, "socks5 res is null");
         // console.info("===socks5 receive", info.length, [...info].slice(0, 16), info.slice(0, 16).toString());
         resolve(undefined);
      });
   }); */
   await wait(5000);
   //testServer?.close();
});

async function wait(ttl) {
   return new Promise((resolve) => {
      setTimeout(() => resolve(undefined), ttl);
   });
}
