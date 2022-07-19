#!/bin/sh
set -e

PHP_FULL_VERSION=$(php -r 'echo phpversion();')
echo "PHP Version : ${PHP_FULL_VERSION}"

if [ -z "$1" ];
then
	DIR="."
else
	DIR="$1"
fi

echo "# Running PHP Code Style Fixer on ${DIR}"

if [ ! -d "${DIR}" ] && [ ! -f "${DIR}" ];
then
	echo "\nInvalid file or directory path: ${DIR}\n\n"
	exit 2
fi

php -d memory_limit=-1 /php-cs-fixer fix --dry-run -v --show-progress=dots --config=/github/workspace/.php_cs "${DIR}"
	