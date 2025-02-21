FROM mysql:latest

COPY my.cnf /etc/mysql/my.cnf

RUN chmod 644 /etc/mysql/my.cnf

RUN mkdir -p /var/log/mysql && touch /var/log/mysql/error.log && chown -R mysql:mysql /var/log/mysql

RUN mkdir -p /docker-entrypoint-initdb.d/

