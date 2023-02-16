import axios from "axios";
import HttpsProxyAgent from "https-proxy-agent";

export function fetch(options: { url: string; [key: string]: any }) {
   if (options.proxy) {
      if (/^https:/i.test(options.url)) {
         var agent = HttpsProxyAgent(`http://${options.proxy.host}:${options.proxy.port}`);
         options.httpsAgent = agent;
         options.proxy = false;
      }
      //delete options.proxy;
   }
   options.responseType = "arraybuffer";
   return axios.request(options).then((res) => {
      return {
         status: res.status,
         statusText: res.statusText,
         headers: res.headers,
         text: (): Promise<string> => {
            return (res.data || "").toString();
         },
         json: (): Promise<{ [key: string]: any }> => {
            let text = (res.data || "").toString();
            return JSON.parse(text);
         },
         arraybuffer: (): Promise<ArrayBuffer> => {
            return res.data;
         },
      };
   });
}
export default fetch;
