FROM node:20

WORKDIR /app

RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    unzip \
    && curl -L https://github.com/felt/tippecanoe/archive/refs/tags/2.69.0.zip -o tippecanoe.zip \
    && unzip tippecanoe.zip \
    && cd tippecanoe-2.69.0 \
    && make \
    && mv tippecanoe /usr/local/bin/ \
    && cd .. \
    && rm -rf tippecanoe.zip tippecanoe-2.69.0

RUN npm install -g tileserver-gl

COPY --chown=node:node ./country_borders.geo.json /app/

RUN tippecanoe -o /app/countries.mbtiles -Z6 -Z12 /app/country_borders.geo.json

EXPOSE 3000

USER node

CMD ["tileserver-gl", "/app/countries.mbtiles"]