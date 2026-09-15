#!/usr/bin/env node
const { join } = require('node:path')
const { assertDistIsFresh, sourceHash } = require('./dist-bundle.cjs')
const root = join(__dirname, '..')
assertDistIsFresh(root)
process.stdout.write(`dist/index.js src-hash ok (${sourceHash(root)})\n`)
