# Card Train wallet gateway — PHP + the Simple Order API extensions (soap/curl/openssl).
FROM php:8.2-cli-alpine

RUN apk add --no-cache libxml2-dev libcurl curl-dev openssl-dev \
    && docker-php-ext-install soap curl \
    && rm -rf /var/cache/apk/*

# Composer
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /app
COPY composer.json ./
RUN composer install --no-dev --no-interaction --prefer-dist --no-progress || true

COPY . .
RUN composer install --no-dev --no-interaction --prefer-dist --no-progress

RUN chmod +x docker-entrypoint.sh
EXPOSE 8080
CMD ["./docker-entrypoint.sh"]
