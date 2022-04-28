import ProxyServer from "transparent-proxy";

export interface Options {
   username?: string;
   password?: string;
}
/**
 * 
 * Options Object
      Param	         Type	               Description
      options	Object	The options object.
      [options.auth]	Function	Activate/Handle Proxy-Authentication. Returns or solves to Boolean.
      [options.upstream]	Function	The proxy to be used to upstreaming requests. Returns String.
      [options.tcpOutgoingAddress]	Function	The localAddress to use while sending requests. Returns String
      [options.injectData]	Function	The edited data to upstream. Returns Buffer or string
      [options.injectResponse]	Function	The edited response to return to connected client. Returns Buffer or string
      [options.keys]	Function	The keys to use while handshake. It will work only if intercept is true. Returns Object or false
      [options.verbose]	Boolean	Activate verbose mode.
      [options.intercept]	Boolean	Activate interception of encrypted communications. False as default.
 * 
 */
export default class LocalServer {
   private server;
   createServer(port: number = 0, host: string = "0.0.0.0", options?: Options, handle?: Function) {
      //init ProxyServer
      options = Object.assign({}, options);
      if (options.username) {
         this.server = new ProxyServer({
            auth: function (username, password) {
               if (!options) return true;
               if (!(options.username && options.password)) return true;
               return username == options?.username && password == options?.password;
            },
         });
      } else {
         this.server = new ProxyServer({});
      }

      this.server.listen(port, host, () => {
         console.info("local proxy server start ok! ", this.server.address());
         handle && handle(this.server);
      });
   }
}
