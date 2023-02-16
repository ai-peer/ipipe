import IPipe, { Cipher } from "../src/index";
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
import fetch from "../src/utils/fetch";

const passwordSecret =
   "g35S152AORUWePWZjezQ8UVZXV5nbTxCkW87ZU+L6gVULjFTL+MP8vgJjBnvhwZM3f0HRhxAECVEWjOjjvuo0SIsV6nZcdQTNHJL/nVb4u2r3qLLSdXIF8A1iipDevmbhYTWrGinuJ7P8xvNJFDwlz9VPQA3zEEDEh8RDSlff6+GpcKcXLtuiWTT0oLkGpS+9ms+abeBv2H8SFafsK7EyfR0DCAtfL2qjxR94bzaYpAeOMGWC2pYumN36+6gyk5NZv8YxukmBArgrWwd36EBCA6kx9sjYLM2JzDOK5XmsXkCe9zlmMW12IhzUej693C0MiG2pnbDsjqSSii5R5qT5w==";
const cipherPassword = Cipher.createCipher(passwordSecret);
process.on("uncaughtException", (err) => {});
process.on("unhandledRejection", (err) => {});
const proxyList: Proxy[] = [];
async function getProxys(): Promise<Proxy[]> {
   if (proxyList.length > 0) return proxyList.sort((a, b) => (Math.floor(Math.random() * 2) == 0 ? -1 : 1));
   let list = await fetch({ url: "https://p0.iee.one/api/client/res/xxx?apikey=ivideos&hasIp=true" }) //
      .then((res) => res.json())
      .then((res) => res.data?.list || []);
   list = list
      .map((v) => {
         return {
            protocol: "wrtc",
            host: v.id,
            username: v.username,
            ip: v.id4,
            country: v.country,
            password: cipherPassword.decode(Buffer.from(v.password, "base64"), v.cf).toString(),
         };
      })
      .filter((v) => /^[a-z0-9]+$/.test(v.password));
   proxyList.push(...list);
   //console.info("list", list.map((v) => v.peer + ":" + v.username + ":" + v.password+":"+v.ip).join("\r\n"));
   return list;
}

const nsecret = password.generateRandomPassword();

export async function createProxyServer(port: number = 4321) {
   //let proxys = await getProxys();
   console.info("createProxyServer port=", port);
   let dport = 8989,
      forwardPort = 9999;
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
      peerId: "demoxxx",
      auth: async ({ username, password, args, protocol }) => {
         let checked = username == "admin" && password == "123";
         return checked;
      },
   });
   acceptProxy.registerAccept(new LightAccept({ secret: nsecret.toString() }));

   acceptProxy.on("accept", (data) => {
      //console.info("=======relayProxy===>accept1", socket.remotePort, data);
   });
   acceptProxy.on("auth", (a) => {
      console.info("auth", a.checked, a.protocol + ":" + a.username + ":" + a.password);
   });
   //acceptProxy.registerProxy({ host: "127.0.0.2", port: 11, protocol: "http" });
   acceptProxy.registerProxy({ host: "127.0.0.1", port: dport, protocol: "http" });
   /* proxys.forEach((proxy) => {
      acceptProxy.registerProxy({
         host: proxy.host,
         port: 0,
         username: proxy.username,
         password: proxy.password,
         protocol: "wrtc",
      });
      //console.info("register proxy", proxy.host + ":" + proxy.username + ":" + proxy.password);
   }); */
   let server1: any = await acceptProxy.createAcceptServer(port);
   console.info("local proxy", server1.address(), port);

   //console.info("relayProxy=====", port, server1.address());
   /*    relayProxy.on("in", (data) => {
      console.info("in", data);
   });
   relayProxy.on("out", (data) => {
      console.info("out", data);
   }); */
   /** 中转代理 */
/*    let forwardProxy = new IPipe({
      isDirect: false,
      auth: async ({ username, password, args, protocol }) => {
         console.info("check forward user", username, password, args, protocol);
         return true;
      },
   });
   let forwardServer = await forwardProxy.createAcceptServer(forwardPort);
   console.info("forward proxy", forwardServer.address(), forwardPort); */

   return directProxy;
}

export async function createProxyServer1(port: number = 4321) {
   let proxys = await getProxys();
   console.info("createProxyServer port=", port);
   let dport = 8989,
      forwardPort = 9999;
   let directProxy = new IPipe({
      isDirect: true,
      peerId: "demoxxx",
      auth: async ({ username, password }) => {
         //console.info("check user", username, password);
         return username == "admin" && password == "123";
      },
   });
   directProxy.on("auth", (data) => console.info("auth", data));
   let server: any = await directProxy.createAcceptServer(port);
   directProxy.registerAccept(new LightAccept({ secret: nsecret.toString() }));

   return directProxy;
}

export async function createProxyServer2(port: number = 4321) {
   let proxys = await getProxys();
   console.info("createProxyServer port=", port);
   let dport = 8989,
      forwardPort = 9999;
   let directProxy = new IPipe({
      isDirect: false,
      peerId: "demoxxx",
      auth: async ({ username, password }) => {
         //console.info("check user", username, password);
         return username == "admin" && password == "123";
      },
   });
   directProxy.on("request", (data) => console.info("event log request", data.host));
   directProxy.on("auth", (data) => console.info("event log auth", data.checked, data.clientIp + ":" + data.username + ":" + data.password, data.protocol));
   let server: any = await directProxy.createAcceptServer(port);
   directProxy.registerAccept(new LightAccept({ secret: nsecret.toString() }));

   proxys.forEach((proxy) => {
      directProxy.registerProxy({
         host: proxy.host,
         port: 0,
         username: proxy.username,
         password: proxy.password,
         protocol: "wrtc",
      });
      //console.info("register proxy", proxy.host + ":" + proxy.username + ":" + proxy.password);
   });

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
export async function requestByWrtc(proxy: Proxy): Promise<Buffer> {
   //console.info("check proxy", proxy);
   let checked = await check.checkWrtc(proxy);
   console.info("wrtc=========receive", `code=${checked}`);
   return Buffer.from(checked ? "OK" : "");
}
export async function requestByLight(proxy: Proxy): Promise<Buffer> {
   proxy.secret = nsecret;
   let checked = await check.checkLight(proxy);
   console.info("light=========receive", `code=${checked}`);
   return Buffer.from(checked ? "OK" : "");
}

export async function requestByForwardHttp(proxy: Proxy): Promise<Buffer> {
   let checked = await check.checkForwardHttp(proxy);
   console.info("http=========receive", `code=${checked}`);
   return Buffer.from(checked ? "OK" : "");
}
async function wait(ttl) {
   return new Promise((resolve) => {
      setTimeout(() => resolve(undefined), ttl);
   });
}
