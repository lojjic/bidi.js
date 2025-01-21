import { runBidiTest } from './BidiTest.js'
import { runBidiCharacterTest } from './BidiCharacterTest.js'

import {bidiFactory} from '../src/index.js'

console.log('Running test suite on src files...')
const bidi = bidiFactory()
const results = [
  runBidiTest(bidi),
  runBidiCharacterTest(bidi)
]

process.exit(Math.max(...results))
