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

- Include the following in your action:
  ```yaml
  - name: php-cs-fixer
    uses: ale94lko/php-cs-fixer-action@v1.0.1
  ```

## Parameters

| Name | Description | Required | Default | Values |
|----------|:----------:|:----------:|:----------:|:----------:|
| php-cs-fixer-version | Version of php-cs-fixer to download | `false` | `v3.9.4` | v`X.X.X` |
| rules-version | Version of rules to check from [php-cs-fixer-rules](https://github.com/ale94lko/php-cs-fixer-rules) | `false` | `v1.0.1` | v`X.X.X` |
| use-full-rules | Whether to use the full rules package or the minimal one | `false` | `true` | `true` OR `false` |

## Examples

### Simple use with default parameters
```yaml
name: Fix code styles
on: [pull_request]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2

      - name: PHP Code Style
        uses: ale94lko/php-cs-fixer-action@v1.0.1
```

### Simple use with `php-cs-fixer-version`
```diff
  - name: PHP Code Style
    uses: ale94lko/php-cs-fixer-action@v1.0.1
+   with:
+     php-cs-fixer-version: v3.9.4
```

### Simple use with `rules-version`
```diff
  - name: PHP Code Style
    uses: ale94lko/php-cs-fixer-action@v1.0.1
+   with:
+     rules-version: v1.0.1
```

### Simple use with `use-full-rules`
```diff
  - name: PHP Code Style
    uses: ale94lko/php-cs-fixer-action@v1.0.1
+   with:
+     use-full-rules: true
```

## View live

- [Successful test](https://github.com/ale94lko/php-cs-fixer-action/runs/7461553837?check_suite_focus=true)
- [Failure test](https://github.com/ale94lko/php-cs-fixer-action/runs/7461551350?check_suite_focus=true)

## Contributing

Please read through our [contributing guidelines](https://github.com/ale94lko/php-cs-fixer-action/blob/main/.github/CONTRIBUTING.md).

## License

**php-cs-fixer-action** is an open source project that is licensed under [MIT](https://opensource.org/licenses/MIT).
