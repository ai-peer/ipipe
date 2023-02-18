import * as com from "./tcommon";
import XPeer from "../src/core/xpeer";
process.on("uncaughtException", (err)=>console.info("err", err));
process.on("unhandledRejection", (err)=>console.info("err1", err));

new XPeer({ id: "localdemo" });
let proxy = {
   host: "127.0.0.1",
   port: 1082,
   protocol: "http",
   username: "admin",
   password: "123",
   random: true,
};
function testWrtc() {
   return new Promise(async (resolve) => {
      console.info("test wrtc===============");
      //let nproxy = Object.assign({}, proxy, { protocol: "wrtc" });
      await com.requestByWrtc({
         host: "demoxxx",
         port: 0,
         protocol: "wrtc",
         username: "admin",
         password: "123",
      });
      resolve(undefined);
   });
}
function testSocks5() {
   return new Promise(async (resolve) => {
      console.info("test socks5===============");
      //let nproxy = Object.assign({}, proxy, { protocol: "wrtc" });
      await com.requestBySocks5({
         host: "127.0.0.1",
         port: 1082,
         protocol: "socks5",
         username: "admin",
         password: "123",
      });
      resolve(undefined);
   });
}
(async () => {
   //await com.createProxyServer(proxy.port);
   await testSocks5();
   //await testWrtc();
})();
