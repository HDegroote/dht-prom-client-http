# DHT Prom Client HTTP

Sidecar to bridge a http prom-client to prom-client-dht.

Useful for services which do not use HyperDHT internally, so they can be scraped by [dht-prometheus](https://github.com/HDegroote/dht-prometheus) without making any changes.

It works by mapping dht-prometheus requests received over RPC to HTTP requests.

## Run

Configuration is set via environment variables. It includes

- `DHT_PROM_HTTP_ADDRESS`: The http address of the metrics server you wish to expose. For example `http://127.0.0.1:9100/metrics`.
- `DHT_PROM_HTTP_ALIAS`: The unique alias used to register with DHT Prometheus.
- `DHT_PROM_HTTP_LOG_LEVEL`: The log level (debug, info...). Defaults to info.
- `DHT_PROM_HTTP_SERVICE`: The service field to pass through DHT Prometheus.
- `DHT_PROM_HTTP_SCRAPER_PUBLIC_KEY`: The public key of the DHT Prometheus instance which will scrape us, in hex or z32 format.
- `DHT_PROM_HTTP_SHARED_SECRET`: The secret used to prove our right to register with the scraper. It is a 32-byte buffer, in hex or z32 format.

### CLI

```
npm i -g dht-prom-client-http
```

Example to proxy a node-exporter, listening on 127.0.0.1:9100:

```
DHT_PROM_HTTP_ADDRESS=http://127.0.0.1:9100/metrics \
DHT_PROM_HTTP_SCRAPER_PUBLIC_KEY=<scraper public key> \
DHT_PROM_HTTP_SHARED_SECRET=<scraper secret> \
DHT_PROM_HTTP_ALIAS="node-exporter-$(hostname)" dht-prom-client-http \
dht-prom-client-http
```

### Docker

See https://hub.docker.com/r/hdegroote/dht-prom-client-http

Example to proxy a node-exporter, listening on 127.0.0.1:9100:

```
docker run --network host \
--env DHT_PROM_HTTP_ADDRESS=http://127.0.0.1:9100/metrics \
--env DHT_PROM_HTTP_SCRAPER_PUBLIC_KEY=<scraper public key> \
--env DHT_PROM_HTTP_SHARED_SECRET=<scraper secret> \
--env DHT_PROM_HTTP_ALIAS="node-exporter-$(hostname)" \
hdegroote/dht-prom-client-http
```
