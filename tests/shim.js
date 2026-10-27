// Jest-style globals on top of Node's built-in test runner (node:test).
// (Jest's VM sandbox is incompatible with the MongoDB driver, so we use node:test + the standalone `expect` library.)
const nodeTest = require('node:test');
const util = require('node:util');
const { expect } = require('expect');

global.expect = expect;
global.describe = nodeTest.describe;
global.beforeAll = nodeTest.before;
global.afterAll = nodeTest.after;
const test = (name, fn) => nodeTest.test(name, fn);
test.each = (rows) => (name, fn) => rows.forEach((row) => nodeTest.test(util.format(name, ...row), () => fn(...row)));
global.test = test;
global.it = test;
