/**
 * 加解密类
 */
export default class Cipher {
   public encodeSecret: Buffer;
   public decodeSecret: Buffer;
   public secret: string;
   constructor(encodeSecret: Buffer, decodeSecret: Buffer) {
      this.encodeSecret = encodeSecret; //encodePassword.slice();
      this.decodeSecret = decodeSecret; //decodePassword.slice();
      this.secret = encodeSecret.toString("base64");
   }
   /**
    * 创建加解密
    * @param secret 密钥
    * @param deviceId  设备码
    */
   static createCipher(secret: string | Buffer) {
      if (typeof secret === "string") {
         secret = Buffer.from(secret, "base64");
      }
      let decodeSecret = Buffer.alloc(256);
      for (let i = 0; i < decodeSecret.length; i++) {
         let value = secret[i];
         decodeSecret.writeUInt8(i, value);
      }
      let cipher = new Cipher(secret, decodeSecret);
      return cipher;
   }
   /**
    * 创建随机默认版本号
    * 规则: version =0 为默认, 创建>=32768 <=65535
    */
   public buildVersion(size: number = 2): number {
      size = Math.floor(size);
      size = Math.min(size, 4);
      let r = 0;
      for (let i = size - 1; i >= 0; i--) {
         r += Math.floor(Math.random() * 256) << (i * 8);
      }
      return r;
   }
   /**
    * 创建face
    */
   public buildFace(): number {
      return Math.floor(Math.random() * 256);
   }

   decode(chunk: Buffer, face: number = 99): Buffer {
      face = face % 256;
      let cs = chunk.map((value) => {
         let nv = this.decodeSecret[value];
         nv = face <= 0 ? nv : nv ^ face;
         return nv;
      });
      /*    let res: Buffer = Buffer.alloc(chunk.length);
      chunk.forEach((v, i) => {
         let nv = this.decodeSecret[v];
         nv = face <= 0 ? nv : nv ^ face;
         res[i] = v;
      }); */

      return Buffer.from(cs);
   }
   encode(chunk: Buffer, face: number = 99): Buffer {
      face = face % 256;
      let cs = chunk.map((value, i) => {
         value = face <= 0 ? value : value ^ face;
         let nv = this.encodeSecret[value];
         return nv;
      });
      /* let res: Buffer = Buffer.alloc(chunk.length);
      chunk.forEach((v, i) => {
         let nv = this.encodeSecret[v];
         nv = face <= 0 ? nv : nv ^ face;
         res[i] = v;
      });
 */
      return Buffer.from(cs);
   }

   /*   toString() {
      return "cipher=" + [...this.encodeSecret.slice(0, 10)] + "..." + [...this.encodeSecret.slice(this.encodeSecret.length - 10)];
   } */
}

/* 
function makeSecretBySign(secret: string, sign: string): Buffer {
   let bsecret = Buffer.from(secret, "base64");
   let replaceObject = string2ObjectCode(sign);
   let list: Array<number> = [];
   for (let i = 0; i < bsecret.length; i++) {
      let v = bsecret[i];
      if (!replaceObject[v]) {
         list.push(v);
      }
   }
   for (let key in replaceObject) {
      list.push(replaceObject[key]);
   }
   return Buffer.from(list);
}

function string2ObjectCode(array) {
   let obj = {};
   for (let i = 0; i < array.length; i++) {
      let v = array[i].charCodeAt(0);
      obj[v] = v;
   }
   return obj;
}
 */
