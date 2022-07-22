<?php

class Fruit
{
    public string $name;
    public string $color;

    public function __construct(string $name)
    {
        $this->name = $name;
    }

    public function getName(): string
    {
        return $this->name;
    }

    public function setName(string $name): void
    {
        $this->name = $name;
    }

    public function getColor(): string
    {
        return $this->color;
    }

    public function setColor(): void
    {
        if ($this->name == 'banana') {
            $this->color = 'yellow';
        } else if ($this->name == 'grape') {
            $this->color = 'purple';
        } else {
            $this->color = 'green';
        }
    }
}