const http = require('http')
const ReadyResource = require('ready-resource')
const DhtPromClient = require('dht-prom-client')

class PromClientHttpBridge extends ReadyResource {
  constructor ({ dht, scraperPublicKey, alias, scraperSecret, promHttpAddress, service }) {
    super()

    this.promHttpAddress = promHttpAddress

    this.client = new DhtPromClient(
      dht,
      this.getMetrics.bind(this),
      scraperPublicKey,
      alias,
      scraperSecret,
      service,
      { bootstrap: dht.bootstrapNodes }
    )
  }

  get publicKey () {
    return this.client.publicKey
  }

  async _open () {
    await this.client.ready()
  }

  async close () {
    // TODO: in progress reqs life cycle on closing
    // (Either destroy sockets, or wait to finish)
    await this.client.close()
  }

  async getMetrics () {
    // TODO: timeout, circuit breaker
    return new Promise((resolve, reject) => {
      http.get(this.promHttpAddress, res => {
        const status = res.statusCode

        const data = []

        res.on('data', chunk => {
          data.push(chunk)
        })

        res.on('end', () => {
          if (status === 200) {
            resolve(data.join(''))
          }

          reject(new Error(
            `Upstream error (status ${status}): ${data.join('')}`
          ))
        })
      }).on('error', err => {
        reject(err)
      })
    })
  }
}

module.exports = PromClientHttpBridge
