//import ProxyServer from "transparent-proxy";
import IPipe from "./index";

interface Options {
   username: string;
   password: string;
}

export default class TestServer {
   private ipipe: IPipe;
   /**
    * 创建http测试代理服务
    * @param port
    * @param host
    * @param options
    * @param handle
    */
   createServer(port: number = 0, host: string = "0.0.0.0", options?: Options, handle?: Function) {
      //init ProxyServer
      options = Object.assign({}, options);
      let ipipe = new IPipe({
         isDirect: true,
         auth: async (username, password) => {
            if (!options) return true;
            if (!(options.username && options.password)) return true;
            return username == options?.username && password == options?.password;
         },
      });
      ipipe.createAcceptServer(port, host, (server) => {
         handle && handle(server);
      });
      this.ipipe = ipipe;
   }

   close() {
      this.ipipe.close();
   }
}
