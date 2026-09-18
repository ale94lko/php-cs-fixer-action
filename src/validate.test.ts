// Copyright (c) php-cs-fixer-action contributors
// SPDX-License-Identifier: MIT

import { describe, expect, it } from 'vitest'
import { ActionError } from './error-tracking'
import {
  parsePaths,
  validateAllInputs,
  validateConfigPath,
  validateGitRef,
  validateMode,
  validatePaths,
  validatePhpCsFixerVersion,
  validateUseFullRules,
} from './validate'
import { DEFAULT_RULES_VERSION } from './inputs'
import type { ActionInputs } from './inputs'

const valid: ActionInputs = {
  phpCsFixerVersion: 'v3.95.21',
  configPath: '',
  rulesVersion: DEFAULT_RULES_VERSION,
  useFullRules: 'true',
  mode: 'check',
  paths: '',
}

describe('validatePhpCsFixerVersion', () => {
  it('accepts a release tag', () => {
    expect(() => validatePhpCsFixerVersion('v3.95.21')).not.toThrow()
  })

  it('rejects a missing v prefix', () => {
    expect(() => validatePhpCsFixerVersion('3.95.21')).toThrow(/Expected a release tag/)
  })

  it('rejects a path-like version', () => {
    expect(() => validatePhpCsFixerVersion('v3.95.21/../../etc/passwd')).toThrow(
      /Expected a release tag/,
    )
  })
})

describe('validateUseFullRules', () => {
  it('accepts true and false', () => {
    expect(() => validateUseFullRules('true')).not.toThrow()
    expect(() => validateUseFullRules('false')).not.toThrow()
  })

  it('rejects yes', () => {
    expect(() => validateUseFullRules('yes')).toThrow(/Expected true or false/)
  })
})

describe('validateGitRef', () => {
  it('accepts main, tags and shas', () => {
    expect(() => validateGitRef('main')).not.toThrow()
    expect(() => validateGitRef('v1.0.1')).not.toThrow()
    expect(() => validateGitRef('abc123def')).not.toThrow()
  })

  it('rejects shell metacharacters and empty refs', () => {
    expect(() => validateGitRef('main;rm -rf /')).toThrow(/Use a tag, branch, or SHA/)
    expect(() => validateGitRef('')).toThrow(/must not be empty/)
  })
})

describe('validateConfigPath', () => {
  it('allows empty and relative configs', () => {
    expect(() => validateConfigPath('')).not.toThrow()
    expect(() => validateConfigPath('tests/fixtures/.php-cs-fixer.dist.php')).not.toThrow()
  })

  it('rejects traversal and absolute paths', () => {
    expect(() => validateConfigPath('../secrets.php')).toThrow(/relative path/)
    expect(() => validateConfigPath('/etc/passwd')).toThrow(/relative path/)
    expect(() => validateConfigPath('C:\\Windows\\secrets.php')).toThrow(/relative path/)
  })
})

describe('validateAllInputs', () => {
  it('accepts the Action defaults', () => {
    expect(() => validateAllInputs(valid)).not.toThrow()
  })

  it('fails closed on a bad version with a typed ActionError', () => {
    try {
      validateAllInputs({ ...valid, phpCsFixerVersion: 'latest' })
      expect.unreachable('expected validation to throw')
    } catch (error) {
      expect(error).toBeInstanceOf(ActionError)
      expect(error).toMatchObject({
        step: 'validate-inputs',
        code: 'INVALID_INPUT',
      })
      expect((error as Error).message).toMatch(/php-cs-fixer-version/)
    }
  })

  it('fails closed on an unknown mode', () => {
    expect(() => validateAllInputs({ ...valid, mode: 'lint' })).toThrow(/Expected check or fix/)
  })
})

describe('validateMode', () => {
  it('accepts check and fix', () => {
    expect(() => validateMode('check')).not.toThrow()
    expect(() => validateMode('fix')).not.toThrow()
  })

  it('rejects unknown values', () => {
    expect(() => validateMode('dry-run')).toThrow(/Expected check or fix/)
    expect(() => validateMode('')).toThrow(/Expected check or fix/)
  })
})

describe('parsePaths', () => {
  it('splits on whitespace and treats empty as no paths', () => {
    expect(parsePaths('')).toEqual([])
    expect(parsePaths('  src   tests/Unit  ')).toEqual(['src', 'tests/Unit'])
  })
})

describe('validatePaths', () => {
  it('allows empty and relative workspace paths', () => {
    expect(() => validatePaths('')).not.toThrow()
    expect(() => validatePaths('src tests/fixtures/Dirty.php')).not.toThrow()
  })

  it('rejects traversal, absolute paths and option-like tokens', () => {
    expect(() => validatePaths('../secrets.php')).toThrow(/relative path/)
    expect(() => validatePaths('/etc/passwd')).toThrow(/relative path/)
    expect(() => validatePaths('C:\\Windows\\secrets.php')).toThrow(/relative path/)
    expect(() => validatePaths('tests/../../etc/passwd')).toThrow(/relative path/)
    expect(() => validatePaths('--allow-risky=yes')).toThrow(/relative path/)
  })
})
