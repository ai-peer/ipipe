import assert from "assert";
beforeEach(async function () {
   await wait(1000);
});

describe("demo", function () {
   /* it("比较取值是否相等", async function () {
      let vv = { name: "li lei" };
      console.info(">>>vv2", vv);
      assert.deepStrictEqual(vv.name, "li lei");
   });
   it("查询", async function () {
      let list = [];
      console.log("list ==", list);
   }); */
});
async function wait(ttl) {
   return new Promise((resolve) => {
      setTimeout(() => resolve(undefined), ttl);
   });
}
