FROM nginxinc/nginx-unprivileged

USER root

RUN apt-get update && apt-get install -y gettext && apt-get clean

USER nginx

WORKDIR /usr/share/nginx/html

COPY --chown=nginx:nginx . .

COPY --chown=nginx:nginx ./conf.d/ /etc/nginx/conf.d/

ARG JAWG_TOKEN

USER root

RUN envsubst < /usr/share/nginx/html/config.js > /usr/share/nginx/html/config.temp.js && \
    mv /usr/share/nginx/html/config.temp.js /usr/share/nginx/html/config.js

USER nginx



