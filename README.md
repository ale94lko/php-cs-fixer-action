<h1 align="center">PHP Coding Standards Fixer Action</h1>
<p>
  <a href="https://github.com/ale94lko/php-cs-fixer-action/blob/main/LICENSE" target="_blank">
    <img alt="License: MIT" src="https://img.shields.io/badge/License-MIT-green.svg" />
  </a>
</p>

> A github action to fix PHP Coding Standards using [php-cs-fixer](https://github.com/FriendsOfPHP/PHP-CS-Fixer).

## Requirements

- Be sure to have set the following before using the action
  ```yaml
  - uses: actions/checkout@v2
  ```

## Setup

- Include the following in your _action_:
  ```yaml
  - name: php-cs-fixer
    uses: ale94lko/php-cs-fixer-action@main
  ```

## Parameters

### php-cs-fixer-version

> Version of php-cs-fixer to download

* required: `false`
* default: `v3.9.4`

### rules-version

> Version of rules to check from [php-cs-fixer-rules](https://github.com/ale94lko/php-cs-fixer-rules)

* required: `false`
* default: `v1.0`

## Example

```yaml
name: Fix code styles
on: [pull_request]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2

      - name: PHP Code Style
        uses: ale94lko/php-cs-fixer-action@main
```

## View live

- [Failure test](https://github.com/ale94lko/php-cs-fixer-action/runs/7422552728?check_suite_focus=true)
- [Successful test](https://github.com/ale94lko/php-cs-fixer-action/runs/7459443044?check_suite_focus=true)

## Contributing

Please read through our [contributing guidelines](https://github.com/ale94lko/php-cs-fixer-action/blob/main/.github/CONTRIBUTING.md).

## License

**php-cs-fixer-action** is an open source project that is licensed under [MIT](https://opensource.org/licenses/MIT).
