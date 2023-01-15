import IPipe from "../src/index";
import LightAccept from "../src/accept/light.accept";
import HttpConnect from "../src/connect/http.connect";
import Socks5Connect from "../src/connect/socks5.connect";
import LightConnect from "../src/connect/light.connect";

import { Proxy } from "../src/types";
import net from "net";
import Stream from "../src/core/stream";
import { Transform } from "stream";
import transform from "../src/core/transform";
import * as password from "../src/core/password";
import SSocket from "../src/core/ssocket";
import * as check from "../src/utils/check";
const tstream = new Stream();
const nsecret = password.generateRandomPassword();
console.info("nsecret", nsecret);

export async function createProxyServer(port: number = 4321) {
   console.info("createProxyServer port=", port);
   let dport = 8989;
   let directProxy = new IPipe({
      isDirect: true,
      /*  auth: async (username, password) => {
         //console.info("check user", username, password);
         //return username == "admin" && password == "123";
         return true;
      }, */
   });
   let server: any = await directProxy.createAcceptServer(dport);
   directProxy.registerAccept(new LightAccept({ secret: nsecret.toString() }));
   /*    directProxy.acceptFactor.on("accept", (socket, data) => {
      console.info("=======targetProxy===>accept0", socket.remotePort, data);
   }); */
   console.info("directProxy=====", server.address(), dport);

   let acceptProxy = new IPipe({
      isDirect: false,
      auth: async (username, password, { args, socket, protocol }) => {
         console.info("check user", username, password, args, protocol, socket.remoteAddress);
         //console.info("relayProxy accept auth====", username, password);
         return username == "admin" && password == "123";
      },
   });

   acceptProxy.registerAccept(new LightAccept({ secret: nsecret.toString() }));
   acceptProxy.acceptFactor.on("accept", (data) => {
      //console.info("=======relayProxy===>accept1", socket.remotePort, data);
   });
   acceptProxy.acceptFactor.on("auth", (a) => {
      //console.info("relayProxy==>auth", a.checked, a.session, a.username, a.password);
   });
   //acceptProxy.registerProxy({ host: "127.0.0.2", port: 11, protocol: "http" });
   acceptProxy.registerProxy({ host: "127.0.0.1", port: dport, protocol: "http" });

   let server1: any = await acceptProxy.createAcceptServer(port);
   //console.info("relayProxy=====", port, server1.address());
   /*    relayProxy.on("in", (data) => {
      console.info("in", data);
   });
   relayProxy.on("out", (data) => {
      console.info("out", data);
   }); */

   return directProxy;
}

export async function requestByHttp(proxy: Proxy): Promise<Buffer> {
   let checked = await check.checkHttp(proxy);
   console.info("http=========receive", `code=${checked}`);
   return Buffer.from(checked ? "OK" : "");
}
export async function requestBySocks5(proxy: Proxy): Promise<Buffer> {
   //console.info("check proxy", proxy);
   let checked = await check.checkSocks5(proxy);
   console.info("socks5=========receive", `code=${checked}`);
   return Buffer.from(checked ? "OK" : "");
}
export async function requestByLight(proxy: Proxy): Promise<Buffer> {
   proxy.secret = nsecret;
   let checked = await check.checkLight(proxy);
   console.info("light=========receive", `code=${checked}`);
   return Buffer.from(checked ? "OK" : "");
}

async function wait(ttl) {
   return new Promise((resolve) => {
      setTimeout(() => resolve(undefined), ttl);
   });
}
