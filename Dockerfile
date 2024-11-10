FROM nginxinc/nginx-unprivileged

USER nginx

WORKDIR /usr/share/nginx/html

COPY --chown=nginx:nginx . .

COPY --chown=nginx:nginx ./conf.d/ /etc/nginx/conf.d/




