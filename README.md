# DHT Prom Client HTTP

Sidecar to bridge a http prom-client to prom-client-dht.

Useful for services which do not use HyperDHT internally, so they can be scraped by [dht-prometheus](https://github.com/HDegroote/dht-prometheus) without making any changes.

It works by mapping dht-prometheus requests received over RPC to HTTP requests.

## Run

### CLI

```
npm i -g dht-prom-client-http
```

```
DHT_PROM_HTTP_SCRAPER_PUBLIC_KEY=<scraper public key> DHT_PROM_HTTP_SHARED_SECRET=<scraper secret> DHT_PROM_HTTP_ALIAS=service-alias dht-prom-client-http
```

### Docker

See https://hub.docker.com/repository/docker/hdegroote/dht-prom-client-http

```
docker run --network host --env DHT_PROM_HTTP_SCRAPER_PUBLIC_KEY=<scraper public key> --env DHT_PROM_HTTP_SHARED_SECRET=<scraper secret> --env DHT_PROM_HTTP_ALIAS=http-bridge-test hdegroote/dht-prom-client-http
```
