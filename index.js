const http = require('http')
const ReadyResource = require('ready-resource')
const DhtPromClient = require('dht-prom-client')

class PromClientHttpBridge extends ReadyResource {
  constructor ({ dht, scraperPublicKey, alias, scraperSecret, promHttpAddress, service, requestTimeoutMs = 5000 }) {
    super()

    this.promHttpAddress = promHttpAddress
    this.requestTimeoutMs = requestTimeoutMs

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
    // TODO: circuit breaker
    return new Promise((resolve, reject) => {
      const req = http.get(
        this.promHttpAddress,
        { timeout: this.requestTimeoutMs },
        res => {
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
        }
      )

      req.on('error', err => {
        reject(err)
      })
      req.on('timeout', () => {
        req.destroy(new Error('Timeout'))
        this.emit('request-timeout')
      })
    })
  }
}

module.exports = PromClientHttpBridge
