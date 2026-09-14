<?php

declare(strict_types=1);

namespace Tests\Fixtures;

final class ValidSample
{
    public function greet(string $name): string
    {
        return 'Hello ' . $name;
    }
}
