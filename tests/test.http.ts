import assert from "assert";
import IPipe from "../src";
import axios from "axios";
import TestServer from "../src/test.server";

let info;
beforeEach(async function () {
   //await wait(1000);
   let proxy = {
      host: "127.0.0.1",
      port: 1082,
      protocol: "http",
      //username: "admin",
      //password: "123456",
      //forwardHost: "127.0.0.1",
      //forwardPort: 1082,
   };
   let ipipe = new IPipe({
      auth: async (username, password) => {
         return username == "admin" && password == "123456";
      },
   });
   let testServer = new TestServer();
   await testServer.createServer(proxy.port, "0.0.0.0", {
      username: "admin",
      password: "123456",
   });

   let acceptServer = await ipipe.createAcceptServer(4321);
   let address: any = acceptServer.address();

   ipipe.registerProxy(proxy);

   ipipe.on("in", (size) => console.info("输入 ", size));
   ipipe.on("out", (size) => console.info("输出 ", size));
   //console.info("address", address);
   //myIp();
   info = await proxyIp({ host: proxy.host, port: address.port });
   ipipe.close();
});

describe("测试http连接", function () {
   it("测试是否http连接成功", function () {
      assert.ok(info.query, "is null");
   });
});

async function wait(ttl) {
   return new Promise((resolve) => {
      setTimeout(() => resolve(undefined), ttl);
   });
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
   //console.info("proxy ip", info);
   return info;
}
