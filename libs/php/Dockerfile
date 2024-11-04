FROM php:8.3-fpm

WORKDIR /var/www/html   

RUN groupadd -g 101 php-fpm \
    && useradd --no-log-init -u 101 -g 101 php-fpm \
    && chown php-fpm:php-fpm -R /var/www/html

USER php-fpm

COPY --chown=php-fpm . /var/www/html/