import { customAlphabet } from "nanoid";
const buildUID = customAlphabet("1234567890ABCDEFGHIJKLMNOPQRSTWUVXYZ", 7);

const PASSWORD_LENGTH = 256;
export function validatePassword(pwd) {
   let pwd_buf;
   if (typeof pwd === "string") {
      pwd_buf = Buffer.from(pwd, "base64");
   } else if (Buffer.isBuffer(pwd)) {
      pwd_buf = pwd;
   }
   if (pwd_buf.length !== PASSWORD_LENGTH && new Set(pwd_buf).size !== PASSWORD_LENGTH) {
      // throw new Error(`It's not a valid password`);
      return false;
   }
   return true;
}

/**
 * 创建随机密钥
 * @param base64
 */
export function generateRandomPassword(base64: boolean = true): string | Buffer {
   let tempArray = new Array(PASSWORD_LENGTH);
   for (let i = 0; i < PASSWORD_LENGTH; i++) {
      tempArray[i] = i;
   }
   tempArray = generateRandom(tempArray);
   let constantSecret = Buffer.from(tempArray);
   return base64 ? constantSecret.toString("base64") : constantSecret;
}

/**
 *  创建序列号, 采用36进制表示法 0-9a-z
 * @param size 要创建的序列号长度, 默认=6
 * @param hexs 进制, 默认36进制方式创建
 */
export function buildSN(size: number = 6) {
  /*  const Hex = Math.min(hexs, 36),
      Char = (Hex - 1).toString(Hex); //采用36进制
   const maxValue = parseInt(Array(11).join(Char), Hex) - 111111111; //1125899906842623; //= parseInt('VVVVVVVVVV', 32)
   const minValue = parseInt(Array(Math.min(size, 6)).join("1"), Hex);
   const factor = Math.random() * maxValue;
   let random = Math.floor(factor + Date.now() * Math.random()) + minValue;
   let sn = random.toString(Hex);
   if (sn.length < size) {
      sn += buildSN(size - sn.length);
   }
   return sn.substring(0, size).toUpperCase(); */
   return buildUID(size).toUpperCase();
}
/**
 * 随机调换位置
 * @param array
 */
function shuffle(array) {
   let tmp;
   let current;
   let top = array.length - 1;
   if (top) {
      while (top) {
         current = Math.floor(Math.random() * (top + 1));
         if (array[current] !== top) {
            tmp = array[current];
            array[current] = array[top];
            array[top] = tmp;
            top -= 1;
         }
      }
   }
   return array;
}

function generateRandom(array) {
   do {
      array = shuffle(array);
   } while (array[0] === 0);
   return array;
}
export default {
   generateRandomPassword,
   validatePassword,
   buildSN,
};
//console.info("bp", generateRandomPassword());
