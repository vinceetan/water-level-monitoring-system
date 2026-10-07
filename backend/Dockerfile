# ---- Stage 1: Composer Dependencies ----
FROM composer:2 AS vendor

WORKDIR /app

COPY composer.json composer.lock ./

RUN composer install \
    --no-dev \
    --no-interaction \
    --no-scripts \
    --prefer-dist \
    --optimize-autoloader

# ---- Stage 2: Application ----
FROM php:8.4-fpm-alpine AS app

# Install system dependencies and PHP extensions required by Laravel + MySQL
RUN apk add --no-cache \
        bash \
        nginx \
        supervisor \
        curl \
        libpng-dev \
        libjpeg-turbo-dev \
        freetype-dev \
        oniguruma-dev \
        libxml2-dev \
        zip \
        unzip \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install \
        pdo_mysql \
        mbstring \
        exif \
        pcntl \
        bcmath \
        gd \
        xml

WORKDIR /var/www/html

# Copy Composer dependencies from the vendor stage
COPY --from=vendor /app/vendor ./vendor

# Copy application source
COPY . .

# Create required Laravel directories and set permissions
RUN mkdir -p storage/framework/{sessions,views,cache} \
    && mkdir -p storage/logs \
    && mkdir -p bootstrap/cache \
    && chown -R www-data:www-data storage bootstrap/cache \
    && chmod -R 775 storage bootstrap/cache

# Copy .env.example as default .env (override via docker-compose environment or bind mount)
RUN cp .env.example .env

# Generate the application key
RUN php artisan package:discover --ansi || true

# ---- Nginx config for reverse-proxying to PHP-FPM ----
RUN cat <<'EOF' > /etc/nginx/http.d/default.conf
server {
    listen 80;
    server_name localhost;
    root /var/www/html/public;
    index index.php index.html;

    client_max_body_size 20M;

    # Handle CORS preflight (OPTIONS) directly at Nginx level.
    # This ensures preflight always gets proper CORS headers,
    # even if Cloudflare or the admin reverse proxy strips them.
    if ($request_method = OPTIONS) {
        add_header 'Access-Control-Allow-Origin' $http_origin always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, PATCH, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'Content-Type, Authorization, Accept, X-Requested-With, Origin' always;
        add_header 'Access-Control-Allow-Credentials' 'true' always;
        add_header 'Access-Control-Max-Age' '86400' always;
        add_header 'Content-Length' '0' always;
        add_header 'Content-Type' 'text/plain' always;
        return 204;
    }

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location ~ \.php$ {
        fastcgi_pass 127.0.0.1:9000;
        fastcgi_index index.php;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        include fastcgi_params;

        # Add CORS headers to all PHP responses (including errors)
        # so a 500 doesn't show up as a misleading CORS error in the browser.
        add_header 'Access-Control-Allow-Origin' $http_origin always;
        add_header 'Access-Control-Allow-Credentials' 'true' always;
    }

    location ~ /\.(?!well-known) {
        deny all;
    }
}
EOF

# ---- Supervisord config to run Nginx + PHP-FPM together ----
RUN cat <<'EOF' > /etc/supervisord.conf
[supervisord]
nodaemon=true
logfile=/var/log/supervisord.log
pidfile=/var/run/supervisord.pid

[program:php-fpm]
command=php-fpm --nodaemonize
autostart=true
autorestart=true
stdout_logfile=/dev/stdout
stdout_logfile_maxbytes=0
stderr_logfile=/dev/stderr
stderr_logfile_maxbytes=0

[program:nginx]
command=nginx -g "daemon off;"
autostart=true
autorestart=true
stdout_logfile=/dev/stdout
stdout_logfile_maxbytes=0
stderr_logfile=/dev/stderr
stderr_logfile_maxbytes=0
EOF

EXPOSE 80

CMD ["/usr/bin/supervisord", "-c", "/etc/supervisord.conf"]