FROM ubuntu:22.04

ARG MODE

WORKDIR /app

# Install necessary dependencies
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


# Install Node.js (from the NodeSource repository)
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs

# Verify Node.js and npm installation
RUN node -v && npm -v

# Install Tippecanoe
RUN curl -L https://github.com/felt/tippecanoe/archive/refs/tags/2.69.0.zip -o tippecanoe.zip \
    && unzip tippecanoe.zip \
    && cd tippecanoe-2.69.0 \
    && make \
    && mv tippecanoe /usr/local/bin/ \
    && cd .. \
    && rm -rf tippecanoe.zip tippecanoe-2.69.0

# Install tileserver-gl
RUN npm install -g tileserver-gl

# Copy GeoJSON data
COPY --chown=node:node ./country_borders.geo.json /app/

# Generate .mbtiles if in production mode
RUN if [ "$MODE" = "production" ]; then \
    tippecanoe -o /app/countries.mbtiles -Z1 -Z8.1 /app/country_borders.geo.json; \
    fi

# Check dependencies for tileserver-gl
RUN ldd /usr/local/lib/node_modules/tileserver-gl/node_modules/@maplibre/maplibre-gl-native/index.node || true

# Expose port
EXPOSE 3000

# Set app directory permissions
RUN groupadd -g 110 node && useradd -u 110 -g node -m node

# Change ownership to the 'node' user and group
RUN chown -R node:node /app 


USER node

# Run tileserver
CMD ["tileserver-gl", "--port", "3000", "/app/countries.mbtiles"]