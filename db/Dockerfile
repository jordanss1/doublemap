FROM mysql:latest

COPY my.cnf /etc/mysql/my.cnf

RUN chmod 644 /etc/mysql/my.cnf

RUN mkdir -p /docker-entrypoint-initdb.d/

CMD echo "$(<../files/db_dump.txt)" > /docker-entrypoint-initdb.d/init.sql && exec mysqld