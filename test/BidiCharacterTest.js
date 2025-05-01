const { readFileSync } = require('fs')
const path = require('path')
const { performance } = require('perf_hooks')

module.exports.runBidiCharacterTest = function (bidi) {
  const text = readFileSync(path.join(__dirname, './BidiCharacterTest.txt'), 'utf-8')
  const lines = text.split('\n')

  const BAIL_COUNT = 10

  let testFilter = null
  // testFilter = (lineNum, dir) => lineNum === 65 && dir === 'auto'

  let testCount = 0
  let passCount = 0
  let failCount = 0
  let totalTime = 0

  lines.forEach((line, lineIdx) => {
    if (line && !line.startsWith('#')) {
      let [input, paraDir, , expectedLevels, expectedOrder] = line.split(';')

      const inputOrig = input
      input = input.split(' ').map(d => String.fromCodePoint(parseInt(d, 16))).join('')
      paraDir = paraDir === '0' ? 'ltr' : paraDir === '1' ? 'rtl' : 'auto'

      if (testFilter && testFilter(lineIdx + 1, paraDir) === false) return

      expectedLevels = expectedLevels.split(' ').map(s => s === 'x' ? s : parseInt(s, 10))
      expectedOrder = expectedOrder.split(' ').map(s => parseInt(s, 10))

      const start = performance.now()
      const embedLevelsResult = bidi.getEmbeddingLevels(input, paraDir)
      const {levels, paragraphs} = embedLevelsResult
      let reordered = bidi.getReorderedIndices(input, embedLevelsResult)
      totalTime += performance.now() - start

      reordered = reordered.filter(i => expectedLevels[i] !== 'x') //those with indeterminate level are ommitted

      let ok = expectedLevels.length === levels.length && paragraphs.length === 1
      if (ok) {
        for (let i = 0; i < expectedLevels.length; i++) {
          if (expectedLevels[i] !== 'x' && expectedLevels[i] !== levels[i]) {
            ok = false
            break
          }
        }
      }
      if (ok) {
        for (let i = 0; i < reordered.length; i++) {
          if (reordered[i] !== expectedOrder[i]) {
            ok = false
            break
          }
        }
      }

      testCount++
      if (ok) {
        passCount++
      } else {
        if (++failCount <= BAIL_COUNT) {
          const types = input.split('').map(ch => bidi.getBidiCharTypeName(ch))
          console.error(`Test on line ${lineIdx + 1}, direction "${paraDir}":
  Input codes:     ${inputOrig}
  Input Types:     ${mapToColumns(types, 5)}
  Expected levels: ${mapToColumns(expectedLevels, 5)}
  Received levels: ${mapToColumns(levels, 5)}
  Expected order:  ${mapToColumns(expectedOrder, 4)}
  Received order:  ${mapToColumns(reordered, 4)}`)
          //  Chars:    ${mapToColumns(input.split(''), 5)}
        }
      }

    }
  })

  let message = `Bidi Character Tests: ${testCount} total, ${passCount} passed, ${failCount} failed`
  if (failCount >= BAIL_COUNT) {
    message += ` (only first ${BAIL_COUNT} failures shown)`
  }
  message += `\n    ${totalTime.toFixed(4)}ms total, ${(totalTime / testCount).toFixed(4)}ms average`

  console.log(message)

  return failCount ? 1 : 0
}

// Add custom tests for multibyte characters
function runCustomMultibyteTests(bidi) {
  console.log('\nRunning Custom Multibyte Tests...')
  let failCount = 0

  const tests = [
    // Basic Multibyte LTR
    { name: "Basic Multibyte LTR", input: "A challenging challenge 🤪!", dir: "ltr", expLevels: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], expOrder: [...Array(27).keys()] }, // Corrected length 27
    // Multibyte RTL
    { name: "Multibyte RTL", input: "سلام 🙂 خوبی؟", dir: "rtl", expLevels: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1], expOrder: [12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0] }, // Length 13 (OK)
    // Mixed Multibyte
    { name: "Mixed Multibyte", input: "ABC 🙂 123 שלום 🥳 XYZ", dir: "auto", expLevels: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0], expOrder: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 14, 13, 12, 11, 15, 16, 17, 18, 19, 20, 21] }, // Corrected levels based on N1/N2 resolution
    // Surrogate Pair at Start/End
    { name: "Surrogate Start", input: "🥳ABC", dir: "ltr", expLevels: [0, 0, 0, 0, 0], expOrder: [0,1,2,3,4] }, // Length 5 (OK)
    { name: "Surrogate End", input: "ABC🥳", dir: "ltr", expLevels: [0, 0, 0, 0, 0], expOrder: [0,1,2,3,4] }, // Length 5 (OK)
    // Adjacent Surrogate Pairs
    { name: "Adjacent Surrogates", input: "🤪🥳", dir: "ltr", expLevels: [0, 0, 0, 0], expOrder: [0,1,2,3] }, // Length 4 (OK)
    // Multibyte within Isolates (Skipping correction for now - definition unclear)
    // { name: "Multibyte Isolate", input: "A [RLI]🥳[PDI] B", dir: "ltr", expLevels: [0, 0, 1, 1, 1, 0], expOrder: [0,1, 4,3,2, 5] }, // Tentative correction
    // Multibyte with Numerals
    { name: "Multibyte Numerals", input: "123 🙂 456", dir: "ltr", expLevels: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], expOrder: [0,1,2,3,4,5,6,7,8,9] }, // Corrected length (10)
    // Multibyte with Brackets
    { name: "Multibyte Brackets", input: "(🥳)", dir: "ltr", expLevels: [0, 0, 0, 0], expOrder: [0,1,2,3] }, // Length 4 (OK)
    // Devanagari + Emoji
    { name: "Devanagari Emoji", input: "Text देवनागरी and 😀 emoji.", dir: "ltr", expLevels: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], expOrder: [...Array(27).keys()] }, // Corrected length 27
  ];

  tests.forEach(test => {
    const { levels } = bidi.getEmbeddingLevels(test.input, test.dir);
    let ok = levels.length === test.expLevels.length;
    if (ok) {
      for (let i = 0; i < test.expLevels.length; i++) {
        if (levels[i] !== test.expLevels[i]) {
          ok = false;
          break;
        }
      }
    }

    // TODO: Add order check once levels are correct

    if (!ok) {
      failCount++;
      console.error(`Custom test FAILED: ${test.name}`);
      console.error(`  Input:   ${test.input}`);
      console.error(`  Expected Levels: ${test.expLevels.join(' ')}`);
      console.error(`  Received Levels: ${[...levels].join(' ')}`); // Convert Uint8Array for printing
    }
  });

  console.log(`Custom Multibyte Tests: ${tests.length} total, ${tests.length - failCount} passed, ${failCount} failed`);
  return failCount;
}

// Export the new function
module.exports.runCustomMultibyteTests = runCustomMultibyteTests;

function mapToColumns (values, colSize) {
  return [...values].map(v => `${v}`.padEnd(colSize)).join('')
}
