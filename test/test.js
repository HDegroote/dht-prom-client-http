const test = require('brittle')
const setupTestnet = require('hyperdht/testnet')
const HyperDHT = require('hyperdht')
const PromClientHttpBridge = require('../index')
const idEnc = require('hypercore-id-encoding')
const axios = require('axios')

const { setupScraper, setupHttpServer } = require('./helpers')

test('HTTP request times out', async t => {
  t.plan(3)

  const testnet = await setupTestnet()
  t.teardown(async () => {
    await testnet.destroy()
  }, 1000)
  const { bootstrap } = testnet

  const { scraper, bridgeHttpAddress } = await setupScraper(t, testnet.bootstrap)
  const httpPort = await setupHttpServer(t, false, { delayMs: 250 })

  const scraperPublicKey = idEnc.normalize(scraper.publicKey)
  const sharedSecret = idEnc.normalize(scraper.secret)
  const alias = 'dummy-alias'
  const promHttpAddress = `http://127.0.0.1:${httpPort}/metrics`
  const service = 'dummy-service'

  const dht = new HyperDHT({ bootstrap })
  const bridge = new PromClientHttpBridge({
    dht,
    scraperPublicKey,
    alias,
    scraperSecret: sharedSecret,
    promHttpAddress,
    service,
    requestTimeoutMs: 50
  })
  bridge.on('request-timeout', () => {
    t.pass('request-timeout triggered')
  })

  await bridge.ready()

  const res = await axios.get(
    `${bridgeHttpAddress}/scrape/dummy-alias/metrics`,
    { validateStatus: false }
  )
  t.ok(res.data.includes('Upstream error: Failed to obtain metrics'), 'upstream error result')
  t.is(res.status, 502, 'status correct')

  /*
  await t.exception(
    async () => await axios.get(
      `${bridgeHttpAddress}/scrape/dummy-alias/metrics`,
      { validateStatus: false }
    ),
    /timeout of 50ms exceeded/
  ) */

  await bridge.close()
})
