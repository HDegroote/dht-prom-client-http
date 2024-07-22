#! /usr/bin/env node

const HyperDHT = require('hyperdht')
const pino = require('pino')
const idEnc = require('hypercore-id-encoding')
const goodbye = require('graceful-goodbye')
const PromClientHttpBridge = require('./index')

function loadConfig () {
  const config = {
    promHttpAddress: process.env.DHT_PROM_HTTP_ADDRESS || 'http://localhost:9100/metrics',
    alias: process.env.DHT_PROM_HTTP_ALIAS,
    logLevel: process.env.DHT_PROM_HTTP_LOG_LEVEL || 'info'
  }

  if (!config.alias) {
    console.error('DHT_PROM_HTTP_ALIAS is required')
  }

  try {
    config.sharedSecret = idEnc.decode(idEnc.normalize(process.env.DHT_PROM_HTTP_SHARED_SECRET))
  } catch (e) {
    console.error('DHT_PROM_HTTP_SHARED_SECRET env var must be set to a valid key')
    process.exit(1)
  }

  try {
    config.scraperPublicKey = idEnc.decode(idEnc.normalize(process.env.DHT_PROM_HTTP_SCRAPER_PUBLIC_KEY))
  } catch (e) {
    console.error('DHT_PROM_HTTP_SCRAPER_PUBLIC_KEY env var must be set to a valid key')
    process.exit(1)
  }

  if (process.env.DHT_PROM_HTTP_BOOTSTRAP_PORT) { // For tests
    config.bootstrap = [{
      port: parseInt(process.env.DHT_PROM_BOOTSTRAP_PORT),
      host: '127.0.0.1'
    }]
  }

  return config
}

async function main () {
  const {
    bootstrap,
    logLevel,
    promHttpAddress,
    sharedSecret,
    alias,
    scraperPublicKey
  } = loadConfig()

  const logger = pino({ level: logLevel })
  logger.info('Starting up Prometheus DHT HTTP bridge')

  const dht = new HyperDHT({ bootstrap })
  const bridge = new PromClientHttpBridge(
    dht,
    scraperPublicKey,
    alias,
    sharedSecret,
    promHttpAddress
  )

  setupLogging(logger, bridge)

  goodbye(async () => {
    logger.info('Shutting down')
    if (bridge.opened) await bridge.close()
    logger.info('Fully shut down')
  })

  await bridge.ready()
  logger.info(`DHT Prom client http bridge ready at public key ${idEnc.normalize(bridge.publicKey)}`)
}

function setupLogging (logger, bridge) {
  const client = bridge.client

  client.on('register-alias-success', ({ updated }) => {
    logger.info(`Successfully registered alias (updated: ${updated}`)
  })

  client.on('register-alias-error', (error) => {
    logger.info('Failed to register alias')
    logger.info(error)
  })

  client.on('metrics-request', ({ uid, remotePublicKey }) => {
    logger.info(`Received metrics request from ${idEnc.normalize(remotePublicKey)} (uid: ${uid})`)
  })

  client.on('metrics-error', ({ uid, error }) => {
    logger.info(`Failed to process metrics request: ${error} (uid: ${uid})`)
  })

  client.on('metrics-success', ({ uid }) => {
    logger.info(`Successfully processed metrics request (uid: ${uid})`)
  })
}

main()
