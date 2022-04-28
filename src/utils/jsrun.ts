import fs from "fs";

/**
 * 从配置文件加载json
 * @param f
 */
export function loadJSONFromFile(f: string) {
   try {
      let s = fs.readFileSync(f);
      return JSON.parse(s.toString("utf8"));
   } catch (err) {
      console.warn(`loadJSONFromFile error ${f} ${err.stack || err.message}`);
      return {};
   }
}
/**
 *
 * @param f
 */
export function runJSFromFile(f: string): any {
   let script = "";
   try {
      let s = fs.readFileSync(f);
      script = s.toString("utf8");
      let v = eval(script);
      return v;
   } catch (err) {
      console.warn("runJSFromFile error", f, script, err);
      return undefined;
   }
}

export function getDirChildsList(dir: string) {
   let list: string[] = [];
   list = fs.readdirSync(dir);
   return list;
}
