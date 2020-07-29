import os from 'os'

const iptable = {}
const ifaces = os.networkInterfaces()
for (let key in ifaces) {
  ifaces[key].forEach((v, i) => {
    if (v.family === 'IPv4' && v.mac !== '00:00:00:00:00:00') {
      iptable[key + (i ? `:${i}` : '')] = v.address
      // internal类型
      let netType = v.internal ? 'internal' : 'extranet'
      !iptable[netType] ? (iptable[netType] = [v.address]) : iptable[netType].push(v.address)
    }
  })
}

export default iptable
