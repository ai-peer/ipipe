module.exports = {
  defaultSeverity: "warn",
  //extends: ['tslint:recommended'],
  extend: ["tslint-config-prettier"], // 继承 tslint-config-prettier
  jsRules: {
    "no-unused-expression": true,
  },
  linterOptions: {
    exclude: ["**/node_modules/**"], // 排除 node_modules
  },
  rules: {
    quotemark: [true, "single"],
    "member-access": [false],
    "ordered-imports": [false],
    "max-line-length": [true, 180],
    "member-ordering": [false],
    "interface-name": [false],
    "arrow-parens": false,
    "object-literal-sort-keys": false,

    typedef: {
      options: ["property-declaration"],
    },
    "class-name": true,
    "interface-name": true,
    "variable-name": {
      options: ["ban-keywords", "check-format", "allow-leading-underscore", "allow-pascal-case"],
    },
    "no-var-keyword": true,
    "no-var-requires": true,
    "no-any": false,
    "no-string-literal": true,
    "await-promise": true,
    "promise-function-async": true,
  },
  rulesDirectory: [],
};
