"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _os = _interopRequireDefault(require("os"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const iptable = {};

const ifaces = _os.default.networkInterfaces();

for (let key in ifaces) {
  ifaces[key].forEach((v, i) => {
    if (v.family === 'IPv4' && v.mac !== '00:00:00:00:00:00') {
      iptable[key + (i ? `:${i}` : '')] = v.address; // internal类型

      let netType = v.internal ? 'internal' : 'extranet';
      !iptable[netType] ? iptable[netType] = [v.address] : iptable[netType].push(v.address);
    }
  });
}

var _default = iptable;
exports.default = _default;