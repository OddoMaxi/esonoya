# ─── Stage 1: Composer dependencies ────────────────────────────────────────────
FROM composer:2.8 AS vendor

WORKDIR /app
COPY composer.json composer.lock ./
RUN composer install \
    --no-dev \
    --no-interaction \
    --no-progress \
    --prefer-dist \
    --optimize-autoloader \
    --no-scripts \
    --ignore-platform-reqs

# ─── Stage 2: Production runtime ────────────────────────────────────────────────
FROM php:8.3-fpm-alpine AS production

# Runtime + build dependencies in one layer; build deps removed after use
RUN apk add --no-cache \
        nginx \
        supervisor \
        postgresql-dev \
        libpng-dev \
        libjpeg-turbo-dev \
        freetype-dev \
        libzip-dev \
        icu-dev \
        icu-libs \
        ghostscript \
        fontconfig \
        ttf-freefont \
        curl \
    && apk add --no-cache --virtual .build-deps \
        $PHPIZE_DEPS \
        oniguruma-dev \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install -j"$(nproc)" \
        pdo_pgsql \
        pgsql \
        gd \
        zip \
        bcmath \
        intl \
        opcache \
        pcntl \
        mbstring \
    && pecl install redis \
    && docker-php-ext-enable redis \
    && apk del .build-deps \
    && rm -rf /tmp/pear /var/cache/apk/*

# PHP runtime config (OPcache, limits, timezone)
COPY docker/php.ini /usr/local/etc/php/conf.d/app.ini

# PHP-FPM pool tuning
COPY docker/fpm-www.conf /usr/local/etc/php-fpm.d/zz-app.conf

# Nginx config (listens on 8000, proxies to 127.0.0.1:9000)
COPY docker/nginx.conf /etc/nginx/http.d/default.conf

# Supervisor (manages nginx + php-fpm in one container)
COPY docker/supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Startup script
COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

WORKDIR /var/www/html

# Application code
COPY --from=vendor /app/vendor vendor/
COPY . .

# Storage writable by www-data; remove dev artefacts
RUN chown -R www-data:www-data storage bootstrap/cache \
    && chmod -R 775 storage bootstrap/cache \
    && rm -rf .git tests/ node_modules

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD curl -sf http://127.0.0.1:8000/up || exit 1

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
