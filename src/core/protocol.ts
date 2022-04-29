import net from "net";

export const Socks5 = {
   buildClientInfo: (host: string, port: number): Buffer => {
      host = host.trim();
      let bhosts: Buffer = Buffer.from(host);
      let bufferSize = 6 + (net.isIPv4(host) ? 4 : bhosts.length + 1);
      let buffer: Buffer = Buffer.alloc(bufferSize, 0); // ByteBuffer.allocate(4 + bhosts.length + 2);
      let offset = 0;
      buffer.writeUInt8(0x05, offset++);
      buffer.writeUInt8(0x01, offset++);
      buffer.writeUInt8(0x00, offset++);
      if (net.isIPv4(host)) {
         buffer.writeUInt8(0x01, offset++);
         let vs: string[] = host.split(/\./);
         for (let i in vs) {
            let v = vs[i];
            buffer.writeUInt8(parseInt(v), offset++);
         }
      } else {
         //域名
         buffer.writeUInt8(0x03, offset++);
         buffer.writeUInt8(bhosts.length, offset++);
         buffer.write(host, offset, host.length);
         offset += host.length;
      }
      let nport: number = port & 0xffff;
      buffer.writeUInt8((nport >> 8) & 0xff, offset++);
      buffer.writeUInt8(nport & 0xff, offset++);
      return buffer;
   },
};
