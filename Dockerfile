FROM php:7.3-cli

LABEL version="1.0"
LABEL repository="https://github.com/ale94lko/php-cs-fixer-action"
LABEL homepage="https://github.com/ale94lko/php-cs-fixer-action"
LABEL maintainer="Fidel Alejandro Fernandez Arias <ale94lko@gmail.com>"

RUN curl -L https://cs.symfony.com/download/php-cs-fixer-v2.phar -o /php-cs-fixer

COPY "entrypoint.sh" "/entrypoint.sh"

RUN chmod +x /entrypoint.sh && chmod a+x /php-cs-fixer

ENTRYPOINT ["/entrypoint.sh"]