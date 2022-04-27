import { Transform } from "stream";
/**
 * stream pipi使用
 * @param callback (chunk, encoding, callback)
 */
export default function (callback: Function) {
   return new Transform({
      transform(chunk, encoding, cb) {
         callback(chunk, encoding, cb);
      },
   });
}
