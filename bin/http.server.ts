import IPipe, { Accept } from "../src";

/**
 * 创建接http协议服务的接收器
 */

class HttpRequestAccept extends Accept {
   public async isAccept(socket: import("net").Socket, chunk: Buffer): Promise<boolean> {
      let protocol = chunk.slice(0, 3).toString().toUpperCase();
      switch (protocol) {
         case "GET": //GET
         case "HEA": //HEAD
         case "PUT": //POST,PUT
         case "POST": //POST,PUT
         case "DEL": //DELETE
         case "OPT": //OPTIONS
         case "TRA": //TRACE
            return true;
      }
      return false;
   }
   public async handle(socket: import("net").Socket, firstChunk: Buffer): Promise<void> {
      let htmls: string[] = [];
      let headers = ["HTTP/1.0 200 OK", "Content-Type: text/html;charset=utf8", "\r\n"];
      htmls.push(headers.join("\r\n"));
      htmls.push(`<html><header><style> body{text-align: center;}</style></header><body>
       <p>ok</p>
       </body></html>`);
      let html = htmls.join("");

      socket.write(html, "utf-8");
      socket.end();
   }
}

(async () => {
   let ipipe = new IPipe({
      //isDirect: true,
   });
   let httpRequestAccept = new HttpRequestAccept();
   ipipe.registerAccept(httpRequestAccept);
   ipipe.createAcceptServer(6379);
})();
