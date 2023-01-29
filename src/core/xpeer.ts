import { buildSN } from "./password";
import IPeer, { SerialSocket } from "@ai-lion/ipeer";
import EventEmitter from "eventemitter3";
import * as utils from "../utils";
import WrtcSocket from "./wrtc.socket";

const FixedPeerId = buildSN(32);

export type XPeerEvent = {
   open: (id: string) => void;
   connection: (socket: WrtcSocket) => void;
};
export default class XPeer extends EventEmitter<XPeerEvent> {
   private static ipeer: IPeer;
   private static _instance: XPeer;
   constructor(id?: string) {
      super();
      id = id || FixedPeerId;
      try {
         this.init(id);
      } catch (err) {
         console.warn("create xpeer error", err);
      }

      XPeer._instance = this;
   }
   static get instance(): XPeer {
      return XPeer._instance;
   }
   private init(peerId: string) {
      if (XPeer._instance) {
         //throw new Error("xpeer is exist ipeer, no create new ipeer");
         return;
      }
      const ipeer = new IPeer(peerId, {
         token: utils.md5(peerId + "pee" + "-" + "rx7430x16A@xa").substring(8, 24),
         handshakeMode: "all",
      });
      XPeer.ipeer = ipeer;
      ipeer.on("open", () => {
         //console.info("open peer", peerId);
         this.emit("open", peerId);
      });
      /** 丢失连接, 重新连接 */
      ipeer.on("disconnected", () => {
         setTimeout(() => ipeer.reconnect(), 10 * 1000);
      });
      ipeer.on("connection", (socket) => {
         let seSocket = new SerialSocket(socket);
         let ssocket = new WrtcSocket(seSocket);
         socket.on("error", () => {});
         this.emit("connection", ssocket);
      });
   }
   get id() {
      return XPeer.ipeer.id;
   }
   connect(id: string, callback: () => void): WrtcSocket {
      let socket = XPeer.ipeer.connect(id);
      socket.on("error", () => {});
      let seSocket = new SerialSocket(socket);
      let ssocket = new WrtcSocket(seSocket);
      socket.once("open", callback);
      return ssocket;
   }
}
