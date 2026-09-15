FROM php:8.3-cli-bookworm

RUN apt-get update \
    && apt-get install -y --no-install-recommends curl ca-certificates xz-utils \
    && curl -fsSL https://nodejs.org/dist/v24.11.1/node-v24.11.1-linux-x64.tar.xz \
      | tar -xJ -C /usr/local --strip-components=1 \
    && rm -rf /var/lib/apt/lists/*

ARG PHP_CS_FIXER_VERSION=v3.95.21
COPY checksums.txt /tmp/checksums.txt
COPY scripts/vendor-php-cs-fixer.sh /tmp/vendor-php-cs-fixer.sh
RUN bash /tmp/vendor-php-cs-fixer.sh "${PHP_CS_FIXER_VERSION}" /opt/php-cs-fixer/php-cs-fixer /tmp/checksums.txt \
    && rm -f /tmp/vendor-php-cs-fixer.sh /tmp/checksums.txt

WORKDIR /app
COPY . .

ENV PHP_CS_FIXER_IGNORE_ENV=1
ENV PHP_CS_FIXER_VERSION=${PHP_CS_FIXER_VERSION}
ENV PHP_CS_FIXER_PHAR=/opt/php-cs-fixer/php-cs-fixer
ENV CONFIG_FILE=tests/fixtures/.php-cs-fixer.dist.php
ENV CONFIG_PATH=tests/fixtures/.php-cs-fixer.dist.php

CMD ["node", "dist/index.js"]
