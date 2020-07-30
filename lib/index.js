import EurekaJsClient from 'eureka-js-client'
import iptable from './ip'
import cleanup from './cleanup'

const CONTEXT_EUREKA = Symbol('context#eureka')

/**
 * [randomNumber 随机返回指定范围内的整数]
 * @param  {Number} min [最小值,只有一个参数时该参数为最大值，最小值为0]
 * @param  {Number} max [最大值]
 * @return {Number}    [指定范围内的整数]
 */
function randomNumber (min = 0, max = 255) {
  if (arguments.length === 1) {
    return Math.round(Math.random() * min)
  } else {
    return Math.round(min + Math.random() * (max - min))
  }
}

class Eureka {
  constructor (opt = {}) {
    this.isLono = true
    this.opt = opt
    this.client = null
    this.curl = null
  }
  install (app) {
    if (app.context.hasOwnProperty(CONTEXT_EUREKA)) return
    const opt = app.$config && app.$config.eureka ? app.$config.eureka : this.opt
    if (opt) {
      if (opt.instance) {
        if (!opt.instance.ipAddr) {
          opt.instance.ipAddr = (iptable && iptable.extranet && iptable.extranet.length && iptable.extranet[0]) || '127.0.0.1'
        }
        if (!opt.instance.port && app.$config.port) {
          opt.instance.port = {
            '$': app.$config.port,
            '@enabled': true
          }
        }
        if (!opt.instance.hostName) {
          (opt.instance.hostName = `${opt.instance.ipAddr}:${opt.instance.port['$']}`)
        }
      }
      this.opt = opt
      this.client = new EurekaJsClient(opt)
      if (opt.debug) {
        this.client.logger.level('debug')
      }
      if (app.context.curl) {
        this.curl = this.createCurl(app.context.curl)
      }
      Object.defineProperties(app.context, {
        [CONTEXT_EUREKA]: {
          value: this,
          writable: false
        },
        'eureka': {
          value: this,
          writable: false
        }
      })
      this.start(app)
    }
  }
  start (app) {
    this.client.start()
    this.client.on('started', () => {
      app.$observer.emit('$eureka:started')
    })
    this.client.on('deregistered', () => {
      app.$observer.emit('$eureka:end')
    })
    cleanup(this.stop.bind(this))
  }
  stop () {
    this.client.stop()
  }
  createCurl (obj) {
    const self = this
    const methods = ['get', 'delete', 'head', 'options', 'post', 'put', 'patch', 'all', 'spread']
    const n = {}
    for (let k in obj) {
      if (typeof obj[k] === 'function' && methods.indexOf(k) > -1) {
        n[k] = function () {
          const args = Array.prototype.slice.call(arguments)
          const url = ''
          let config = {}
          // (feign, url, config)
          if (args.length > 2) {
            const feign = args[0]
            url = args[1]
            config = {
              baseURL: self.getInstancesUrl(self.getInstancesByAppId(feign)),
              ...args[2]
            }
          // (url, config={feign:''})
          } else {
            const feign = args[1].feign
            url = args[0]
            config = {
              baseURL: self.getInstancesUrl(self.getInstancesByAppId(feign)),
              ...args[1]
            }
            delete config.feign
          }
          return obj[k].apply(obj, [url, config])
        }
      }
    }
    return n
  }
  getInstancesUrl (instances) {
    let random = randomNumber(0, instances.length - 1)
    return instances[random].homePageUrl
  }
  /**
   * [getInstancesByAppId description]
   * @param  {[type]} appID [description]
   * @return {Array}        [instances]
   */
  getInstancesByAppId (appID) {
    return this.client.getInstancesByAppId(appID)
  }
  getInstancesByVipAddress (vipAddress) {
    return this.client.getInstancesByVipAddress(vipAddress)
  }
}

export default function (...agr) {
  return new Eureka(...agr)
}
