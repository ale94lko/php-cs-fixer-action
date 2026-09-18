// Copyright (c) php-cs-fixer-action contributors
// SPDX-License-Identifier: MIT

import { vi } from 'vitest'

vi.mock('@actions/cache', () => ({
  isFeatureAvailable: vi.fn(() => false),
  restoreCache: vi.fn(),
  saveCache: vi.fn(),
}))
