# DHT Prom Client HTTP

Sidecar to bridge a http prom-client to prom-client-dht.

Useful for services which do not use HyperDHT internally, so they can be scraped by [dht-prometheus](https://github.com/HDegroote/dht-prometheus) without making any changes.

It works by mapping dht-prometheus requests received over RPC to HTTP requests.
