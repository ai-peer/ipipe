import IPipe from "../src";
import axios from "axios";
import LightAccept from "../src/accept/light.accept";
import LightConnect from "../src/connect/light.connect";
/* 
let cFileConfig = path.resolve(__dirname, "../env/config.js");
console.info("file", cFileConfig);
let configProxy = runJSFromFile(cFileConfig);
let proxyList = configProxy.getProxyList("CN", 1);
console.info("proxyList", proxyList); */

(async () => {
   let chunk = Buffer.from("abcdok");
   console.info([...chunk], chunk.toString());
   chunk.forEach((v, i) => {
      chunk[i] = v + 1;
   });
   console.info([...chunk], chunk.toString());
})();
