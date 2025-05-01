import * as bidiFactory from '../src/index.js'
const { runBidiCharacterTest, runCustomMultibyteTests } = require('./BidiCharacterTest.js')
const { runBidiTest } = require('./BidiTest.js')

console.log('Running test suite on src files...')

const bidi = bidiFactory
let failures = 0
const bidiInstance = bidiFactory.getEmbeddingLevels ? bidiFactory : bidiFactory()

failures += runBidiTest(bidiInstance)
failures += runBidiCharacterTest(bidiInstance)
failures += runCustomMultibyteTests(bidiInstance)

process.exit(failures)
