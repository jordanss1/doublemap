FROM nginxinc/nginx-unprivileged

USER root

RUN apt-get update && apt-get install -y gettext

USER nginx

WORKDIR /usr/share/nginx/html

COPY --chown=nginx:nginx . .

COPY --chown=nginx:nginx ./conf.d/ /etc/nginx/conf.d/




