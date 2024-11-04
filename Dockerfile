FROM nginxinc/nginx-unprivileged

WORKDIR /usr/share/nginx/html

COPY --chown=nginx:nginx . .

COPY --chown=nginx:nginx ./conf.d/ /etc/nginx/conf.d/


# Dev commands for tailwind 

COPY --chown=nginx:nginx --chmod=0755 start.sh /usr/local/bin/start.sh

CMD ["/usr/local/bin/start.sh"]




