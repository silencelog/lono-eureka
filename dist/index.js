"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = _default;

var _request = _interopRequireDefault(require("request"));

var _axios = _interopRequireDefault(require("axios"));

var _eurekaJsClient = _interopRequireDefault(require("eureka-js-client"));

var _ip = _interopRequireDefault(require("./ip"));

var _cleanup = _interopRequireDefault(require("./cleanup"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const CONTEXT_EUREKA = Symbol('context#eureka');
/**
 * [randomNumber 随机返回指定范围内的整数]
 * @param  {Number} min [最小值,只有一个参数时该参数为最大值，最小值为0]
 * @param  {Number} max [最大值]
 * @return {Number}    [指定范围内的整数]
 */

function randomNumber(min = 0, max = 255) {
  if (arguments.length === 1) {
    return Math.round(Math.random() * min);
  } else {
    return Math.round(min + Math.random() * (max - min));
  }
}

function eurekaify(self, fn) {
  return function () {
    let args = Array.prototype.slice.call(arguments);
    return new Promise(function (resolve, reject) {
      args.push(function (err, result) {
        if (err) reject(err);else resolve(result);
      });

      if (args.length > 1) {
        let [arg0, arg1, ...agrsN] = args;
        args = [self.getInstancesUrl.call(self, self.getInstancesByAppId.call(self, arg0)) + arg1, ...agrsN];
      }

      fn.apply(null, args);
    });
  };
}

function eurekafn(self, fn) {
  return function () {
    let args = Array.prototype.slice.call(arguments);

    if (args.length > 1) {
      let [arg0, arg1, ...agrsN] = args;
      args = [self.getInstancesUrl.call(self, self.getInstancesByAppId.call(self, arg0)) + arg1, ...agrsN];
    } else if (args.length && args[0].feign && args[0].url) {
      args[0] = self.getInstancesUrl.call(self, self.getInstancesByAppId.call(self, args[0].feign)) + args[0].url;
    }

    fn.apply(null, args);
  };
}

function eurekaifyAll(self, obj = {}) {
  let n = {};

  for (let k in obj) {
    if (typeof obj[k] === 'function' && !/.*Async$/.test(k)) {
      n[k + 'Async'] = eurekaify(self, obj[k]);
      n[k] = eurekafn(self, obj[k]);
    }
  }

  return n;
} // TODO 轮询请求，请求失败执行下一个请求，都失败返回异常


class LodeEureka {
  constructor(opt = {}) {
    this.isLode = true;
    this.opt = opt;
    this.client = null;
    this.curl = null;
  }

  install(lode) {
    if (lode.context.hasOwnProperty(CONTEXT_EUREKA)) return;
    const opt = lode.$config && lode.$config.eureka ? lode.$config.eureka : this.opt;

    if (opt) {
      if (opt.instance) {
        if (!opt.instance.ipAddr) {
          opt.instance.ipAddr = _ip.default && _ip.default.extranet && _ip.default.extranet.length && _ip.default.extranet[0] || '127.0.0.1';
        }

        if (!opt.instance.port && lode.$config.port) {
          opt.instance.port = {
            '$': lode.$config.port,
            '@enabled': true
          };
        }

        if (!opt.instance.hostName) {
          opt.instance.hostName = `${opt.instance.ipAddr}:${opt.instance.port['$']}`;
        }
      }

      this.opt = opt;
      this.client = new _eurekaJsClient.default(opt); // this.curl.getAsync({
      //   feign: 'web',
      //   url: 'index'
      // })

      if (opt.debug) {
        this.client.logger.level('debug');
      }

      this.curl = eurekaifyAll(this, _request.default); // this.curl = this.changeCurl(axios)

      Object.defineProperties(lode.context, {
        [CONTEXT_EUREKA]: {
          value: this,
          writable: false
        },
        'eureka': {
          value: this,
          writable: false
        }
      });
      this.start(lode);
    }
  }

  start(lode) {
    this.client.start();
    this.client.on('started', () => {
      lode.$observer.emit('$eureka:started');
    });
    this.client.on('deregistered', () => {
      lode.$observer.emit('$eureka:end');
    });
    (0, _cleanup.default)(this.stop.bind(this));
  }

  stop() {
    this.client.stop();
  }

  createCurl(fn) {
    const args = Array.prototype.slice.call(arguments);

    if (args.length > 1) {
      let [arg0, arg1, ...agrsN] = args;
      args = [this.getInstancesUrl.call(this, this.getInstancesByAppId.call(this, arg0)) + arg1, ...agrsN];
    } else if (args.length && args[0].feign && args[0].url) {
      args[0] = this.getInstancesUrl(this.getInstancesByAppId.call(this, args[0].feign)) + args[0].url;
    }

    return fn.apply(null, args);
  }

  changeCurl(obj) {
    const n = {};

    for (let k in obj) {
      if (typeof obj[k] === 'function') {
        n[k] = this.createCurl(obj[k]);
      }
    }

    return n;
  }

  getInstancesUrl(instances) {
    let random = randomNumber(0, instances.length - 1);
    return instances[random].homePageUrl;
  }
  /**
   * [getInstancesByAppId description]
   * @param  {[type]} appID [description]
   * @return {Array}        [instances]
   */


  getInstancesByAppId(appID) {
    return this.client.getInstancesByAppId(appID);
  }

  getInstancesByVipAddress(vipAddress) {
    return this.client.getInstancesByVipAddress(vipAddress);
  }

}

function _default(...agr) {
  return new LodeEureka(...agr);
}