/* import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
dayjs.extend(utc);
dayjs.extend(timezone); */

const timezonel = "Asia/Shanghai";
const isDev = process.env.NODE_ENV == "development";

class Logger {
   info(...args) {
      console.info(format("YYYY-MM-DD HH:mm:ss"), "[INFO]", ...args);
   }
   warn(...args) {
      console.warn(format("YYYY-MM-DD HH:mm:ss"), "[WARN]", ...args);
   }
   error(...args) {
      console.error(format("YYYY-MM-DD HH:mm:ss"), "[ERROR]", ...args);
   }
   log(...args) {
      if (isDev) console.log(format("YYYY-MM-DD HH:mm:ss"), "[LOG]", ...args);
   }
   debug(...args) {
      if (isDev) console.log(format("YYYY-MM-DD HH:mm:ss"), "[DEBUG]", ...args);
   }
}

export default new Logger();

function format(fmt: string = "YYYY-MM-DD HH:mm:ss", date?: Date) {
   date = date || new Date();
   var o = {
      "M+": date.getMonth() + 1, //月份
      "d+": date.getDate(), //日
      "D+": date.getDate(), //日
      "h+": date.getHours(), //小时
      "H+": date.getHours(), //小时
      "m+": date.getMinutes(), //分
      "s+": date.getSeconds(), //秒
      "q+": Math.floor((date.getMonth() + 3) / 3), //季度
      S: date.getMilliseconds(), //毫秒
   };
   if (/(y+)/i.test(fmt)) {
      fmt = fmt.replace(RegExp.$1, (date.getFullYear() + "").substr(4 - RegExp.$1.length));
   }
   for (var k in o) {
      if (new RegExp("(" + k + ")").test(fmt)) {
         fmt = fmt.replace(RegExp.$1, RegExp.$1.length == 1 ? o[k] : ("00" + o[k]).substr(("" + o[k]).length));
      }
   }
   return fmt;
}
