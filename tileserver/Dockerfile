FROM ubuntu:22.04

ARG MODE

WORKDIR /app


RUN apt-get update && apt-get install -y \
    curl \
    unzip \
    software-properties-common \
    libjpeg-turbo8 \
    build-essential \
    libgl1-mesa-glx \
    libgl1-mesa-dri \
    libglvnd0 \
    libopengl0 \
    mesa-utils \
    libuv1 \
    libicu70 \
    libsqlite3-dev \ 
    zlib1g-dev \
    && ! -f /usr/lib/x86_64-linux-gnu/libjpeg.so.8 ] && ln -s /usr/lib/x86_64-linux-gnu/libjpeg.so.62 /usr/lib/x86_64-linux-gnu/libjpeg.so.8 || echo "Symbolic link already exists"



RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs


RUN node -v && npm -v


RUN curl -L https://github.com/felt/tippecanoe/archive/refs/tags/2.69.0.zip -o tippecanoe.zip \
    && unzip tippecanoe.zip \
    && cd tippecanoe-2.69.0 \
    && make \
    && mv tippecanoe /usr/local/bin/ \
    && cd .. \
    && rm -rf tippecanoe.zip tippecanoe-2.69.0


RUN npm install -g tileserver-gl


COPY --chown=node:node . /app/

RUN mkdir /app/borders

RUN tippecanoe -o /app/borders/countries.mbtiles -Z1 -z7 --drop-densest-as-needed --force ./country_borders.geo.json 


RUN ldd /usr/local/lib/node_modules/tileserver-gl/node_modules/@maplibre/maplibre-gl-native/index.node || true


EXPOSE 3000


RUN groupadd -g 110 node && useradd -u 110 -g node -m node


RUN chown -R node:node /app 


USER node


CMD ["tileserver-gl", "--port", "3000", "--config", "./config.json"]