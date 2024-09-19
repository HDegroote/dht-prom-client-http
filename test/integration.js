const process = require('process')
const { spawn } = require('child_process')
const path = require('path')
const NewlineDecoder = require('newline-decoder')
const test = require('brittle')
const setupTestnet = require('hyperdht/testnet')
const idEnc = require('hypercore-id-encoding')
const axios = require('axios')

const { setupScraper, setupHttpServer } = require('./helpers')

const EXECUTABLE = path.join(path.dirname(__dirname), 'run.js')

// To force the process.on('exit') to be called on those exits too
process.prependListener('SIGINT', () => process.exit(1))
process.prependListener('SIGTERM', () => process.exit(1))

const DEBUG = false

test('integration test (happy flow)', async t => {
  const tStartup = t.test('startup')
  tStartup.plan(1)

  const tShutdown = t.test('shutdown')
  tShutdown.plan(2)

  const testnet = await setupTestnet()
  t.teardown(async () => {
    await testnet.destroy()
  }, 1000)

  const httpPort = await setupHttpServer(t, DEBUG)
  const { scraper, bridgeHttpAddress } = await setupScraper(t, testnet.bootstrap, DEBUG)

  const scraperPublicKey = idEnc.normalize(scraper.publicKey)
  const sharedSecret = idEnc.normalize(scraper.secret)

  const httpPromClientProc = spawn(
    process.execPath,
    [EXECUTABLE],
    {
      env: {
        DHT_PROM_HTTP_LOG_LEVEL: 'debug',
        DHT_PROM_HTTP_ADDRESS: `http://127.0.0.1:${httpPort}/metrics`,
        DHT_PROM_HTTP_ALIAS: 'dummy',
        DHT_PROM_HTTP_SERVICE: 'test-service',
        DHT_PROM_HTTP_SHARED_SECRET: sharedSecret,
        DHT_PROM_HTTP_SCRAPER_PUBLIC_KEY: scraperPublicKey,
        DHT_PROM_HTTP_BOOTSTRAP_PORT: testnet.bootstrap[0].port
      }
    }
  )

  // To avoid zombie processes in case there's an error
  process.on('exit', () => {
    // TODO: unset this handler on clean run
    httpPromClientProc.kill('SIGKILL')
  })

  httpPromClientProc.stderr.on('data', d => {
    console.error(d.toString())
    t.fail('There should be no stderr')
  })

  const stdoutDec = new NewlineDecoder('utf-8')
  httpPromClientProc.stdout.on('data', async d => {
    if (DEBUG) console.log(d.toString())

    for (const line of stdoutDec.push(d)) {
      if (line.includes('successfully registered alias')) {
        tStartup.pass('Successfully registered alias')
      }

      if (line.includes('Fully shut down')) {
        tShutdown.pass('Shut down cleanly')
      }
    }
  })

  await tStartup

  const metrics = await axios.get(
    `${bridgeHttpAddress}/scrape/dummy/metrics`,
    { validateStatus: false }
  )
  t.is(metrics.status, 200, 'could scrape')
  t.is(
    metrics.data,
    `# HELP promhttp_metric_handler_requests_in_flight Current number of scrapes being served.
# TYPE promhttp_metric_handler_requests_in_flight gauge
promhttp_metric_handler_requests_in_flight 1`,
    'sanity check: returned correct metrics'
  )

  httpPromClientProc.on('close', () => {
    tShutdown.pass('Process exited')
  })

  httpPromClientProc.kill('SIGTERM')
  await tShutdown
})
