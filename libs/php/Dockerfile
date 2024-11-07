FROM php:8.3-fpm

ARG MODE

RUN groupadd -g 101 php-fpm \
    && useradd --no-log-init -u 101 -g 101 php-fpm \
    && chown php-fpm:php-fpm -R /var/www/html

USER root

RUN curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer

USER php-fpm

WORKDIR /var/www/html   

USER root

RUN apt-get update && apt-get install -y \
        git \
        zip \
        unzip \
        libzip-dev && \
    docker-php-ext-install zip

RUN composer require vlucas/phpdotenv

RUN if ["$MODE" = "development"]; then composer install --dev --prefer-dist; \
   else composer install --no-dev --prefer-dist; fi

COPY php.ini /usr/local/etc/php/

COPY --chown=php-fpm . /var/www/html/