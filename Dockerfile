FROM node:20-slim

RUN useradd --create-home -u 4163 dht-prom-client-http

COPY package-lock.json /home/dht-prom-client-http/
COPY node_modules /home/dht-prom-client-http/node_modules
COPY package.json /home/dht-prom-client-http/
COPY run.js /home/dht-prom-client-http/
COPY index.js /home/dht-prom-client-http/
COPY LICENSE /home/dht-prom-client-http/
COPY NOTICE /home/dht-prom-client-http/

USER dht-prom-client-http

WORKDIR /home/dht-prom-client-http

ENTRYPOINT ["node", "/home/dht-prom-client-http/run.js"]
