import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
dayjs.extend(utc);
dayjs.extend(timezone);

const timezonel = "Asia/Shanghai";
const isDev = process.env.NODE_ENV == "development";

class Logger {
   info(...args) {
      console.info(dayjs().tz(timezonel).format("YYYY-MM-DD HH:mm:ss"), "[INFO]", ...args);
   }
   warn(...args) {
      console.warn(dayjs().tz(timezonel).format("YYYY-MM-DD HH:mm:ss"), "[WARN]", ...args);
   }
   error(...args) {
      console.error(dayjs().tz(timezonel).format("YYYY-MM-DD HH:mm:ss"), "[ERROR]", ...args);
   }
   log(...args) {
      if (isDev) console.log(dayjs().tz(timezonel).format("YYYY-MM-DD HH:mm:ss"), "[LOG]", ...args);
   }
}

export default new Logger();
