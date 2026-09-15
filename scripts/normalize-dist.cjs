#!/usr/bin/env node
const { join } = require('node:path')
require('./dist-bundle.cjs').normalizeDist(join(__dirname, '..'))
