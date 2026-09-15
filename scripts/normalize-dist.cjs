#!/usr/bin/env node
const { readdirSync, readFileSync, statSync, writeFileSync } = require('node:fs')
const { join } = require('node:path')

const dist = join(__dirname, '..', 'dist')

for (const name of readdirSync(dist)) {
  const path = join(dist, name)
  if (!statSync(path).isFile()) {
    continue
  }

  const buf = readFileSync(path)
  if (!buf.includes(0x0d)) {
    continue
  }

  writeFileSync(path, buf.toString('utf8').replace(/\r\n/g, '\n').replace(/\r/g, '\n'))
}
