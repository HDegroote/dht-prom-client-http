const PrometheusDhtBridge = require('dht-prometheus')
const hypCrypto = require('hypercore-crypto')
const getTmpDir = require('test-tmp')
const Hyperswarm = require('hyperswarm')
const Fastify = require('fastify')
const path = require('path')

async function setupScraper (t, bootstrap, debug = false) {
  const sharedSecret = hypCrypto.randomBytes(32)

  const swarm = new Hyperswarm({ bootstrap })
  const server = new Fastify({ logger: debug })
  const tmpDir = await getTmpDir(t)
  const prometheusTargetsLoc = path.join(tmpDir, 'prom-targets.json')
  const bridge = new PrometheusDhtBridge(swarm, server, sharedSecret, {
    _forceFlushOnClientReady: true, // to avoid race conditions
    prometheusTargetsLoc
  })

  t.teardown(async () => {
    await server.close()
    await bridge.close()
    await swarm.destroy()
  })

  await bridge.ready()
  await bridge.swarm.flush()
  const bridgeHttpAddress = await new Promise((resolve, reject) => {
    server.listen({ port: 0, host: '127.0.0.1' }, (err, address) => {
      if (err) {
        reject(err)
      } else {
        resolve(`http://127.0.0.1:${address.split(':')[2]}`)
      }
    })
  })

  return { scraper: bridge, bridgeHttpAddress }
}

async function setupHttpServer (t, debug = false, { delayMs = 0 } = {}) {
  const httpServer = new Fastify({ logger: debug })
  httpServer.get('/metrics', async (req, reply) => {
    if (delayMs) await new Promise(resolve => setTimeout(resolve, delayMs))

    reply.send(`# HELP promhttp_metric_handler_requests_in_flight Current number of scrapes being served.
# TYPE promhttp_metric_handler_requests_in_flight gauge
promhttp_metric_handler_requests_in_flight 1`)
  })

  t.teardown(async () => {
    await httpServer.close()
  })

  return await new Promise((resolve, reject) => {
    httpServer.listen({ port: 0, host: '127.0.0.1' }, (err, address) => {
      if (err) {
        reject(err)
      } else {
        const port = address.split(':')[2]
        resolve(port)
      }
    })
  })
}

module.exports = {
  setupScraper,
  setupHttpServer
}
