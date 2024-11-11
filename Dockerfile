FROM nginxinc/nginx-unprivileged

ARG MAPBOX_TOKEN_JS

USER root

RUN apt-get update && apt-get install -y gettext

USER nginx

WORKDIR /usr/share/nginx/html

COPY --chown=nginx:nginx . .

COPY --chown=nginx:nginx ./conf.d/ /etc/nginx/conf.d/

USER root

RUN envsubst '$MAPBOX_TOKEN_JS' < /usr/share/nginx/html/config.js > /usr/share/nginx/html/config.js.temp && \
    mv /usr/share/nginx/html/config.js.temp /usr/share/nginx/html/config.js

RUN chown nginx:nginx config.js

USER nginx



