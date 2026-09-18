<?php

declare(strict_types=1);

$finder = PhpCsFixer\Finder::create()
    ->in(__DIR__)
    ->name('*.php')
    ->notName('.php-cs-fixer.dist.php');

return (new PhpCsFixer\Config())
    // Prefer this over deprecated PHP_CS_FIXER_IGNORE_ENV when running on a PHP
    // version newer than the Fixer's declared support (removed in php-cs-fixer 4.0).
    ->setUnsupportedPhpVersionAllowed(true)
    ->setRiskyAllowed(true)
    ->setRules([
        '@PSR12' => true,
    ])
    ->setFinder($finder);
