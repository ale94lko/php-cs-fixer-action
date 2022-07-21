<?php declare(strict_types=1);
$header = <<<'EOF'
This file is part of ale94lko/php-cs-fixer-action.

(c) Fidel Alejandro Fernandez Arias <ale94lko@gmail.com>

For the full copyright and license information, please view the LICENSE
file that was distributed with this source code.
EOF;

class Fuit
{
    /**
     * @var string
     */
    public string $name;

    /**
     * @var string
     */
    public string $color;

    /**
     * @param string $name
     * @param string $color
     */
    public function __construct(string $name, string $color)
    {
        $this->name = $name;
        $this->color = $color;
    }

    /**
     * @return string
     */
    public function getName(): string
    {
        return $this->name;
    }

    /**
     * @param string $name
     */
    public function setName(string $name): void
    {
        $this->name = $name;
    }

    /**
     * @return string
     */
    public function getColor(): string
    {
        return $this->color;
    }

    /**
     * @param string $color
     */
    public function setColor(string $color): void
    {
        $this->color = $color;
    }
}