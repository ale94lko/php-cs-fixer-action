FROM php:8.3-cli-bookworm

RUN apt-get update \
    && apt-get install -y --no-install-recommends curl ca-certificates bash \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY . .

ENV PHP_CS_FIXER_IGNORE_ENV=1
ENV PHP_CS_FIXER_VERSION=v3.95.21
ENV CONFIG_FILE=tests/fixtures/.php-cs-fixer.dist.php

CMD ["bash", "scripts/ci-local.sh"]
