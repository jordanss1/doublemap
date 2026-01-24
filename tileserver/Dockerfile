FROM maptiler/tileserver-gl:latest

WORKDIR /app

USER root
RUN apt-get update && \
    DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
        build-essential \
        unzip \
        libsqlite3-dev \
        zlib1g-dev \
        curl \
    && rm -rf /var/lib/apt/lists/*

RUN curl -L https://github.com/felt/tippecanoe/archive/refs/tags/2.79.0.zip -o tippecanoe.zip && \
    unzip tippecanoe.zip && \
    cd tippecanoe-2.79.0 && \
    make && \
    mv tippecanoe /usr/local/bin/ && \
    cd / && rm -rf tippecanoe.zip tippecanoe-2.79.0

COPY --chown=node:node . /app/

RUN mkdir -p /app/borders && \
    chown -R node:node /app/borders && \
    sudo -u node tippecanoe -o /app/borders/countries.mbtiles -Z1 -z7 --drop-densest-as-needed --force ./country_borders.geo.json

USER node

EXPOSE 3000

CMD ["tileserver-gl", "--port", "3000", "--config", "./config.json"]
