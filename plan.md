# Bidi-js Multibyte Character Bug Fix Plan

## 1. Summary of the Bug

The current implementation iterates through input strings using standard JavaScript `for` loops (`for (let i = 0; i < string.length; i++)`) and accesses characters using code unit indexing (`string[i]` or `string.charAt(i)`). This works correctly for strings containing only characters within the Basic Multilingual Plane (BMP), where each character corresponds to a single 16-bit code unit.

However, JavaScript strings use UTF-16 encoding. Characters outside the BMP (e.g., many emojis, some CJK ideographs, historic scripts) are represented using *surrogate pairs*, which consist of *two* 16-bit code units.

The bug occurs because the code treats each code unit as a separate character:
- When a surrogate pair is encountered, `string[i]` accesses only the first (high) surrogate unit.
- `getBidiCharType(string[i])` receives only this high surrogate, leading to an incorrect Bidi type classification (often treated as 'L' or 'ON' instead of the actual character's type).
- Arrays like `charTypes` and `embedLevels` are sized based on `string.length` (number of code units), not the actual number of characters (code points). This leads to incorrect lengths and indexing when multibyte characters are present.
- Subsequent operations like reordering (`src/reordering.js`) and mirroring (`src/mirroring.js`) inherit these incorrect levels and indices, producing wrong results.

The proposed fix involves switching from code unit iteration/indexing to code point iteration/indexing.

## 2. Relevant Files and Code Sections

- **`src/embeddingLevels.js`**: This is the core file where the bug originates.
    - **Line 60-62**: The main loop `for (let i = 0; i < string.length; i++)` and `string[i]` access.
    - **Line 59**: `charTypes = new Uint32Array(string.length)` - incorrect sizing.
    - **Line 74**: `embedLevels = new Uint8Array(string.length)` - incorrect sizing.
    - Potentially other loops and index calculations within this file that assume code unit indexing.
- **`src/reordering.js`**: Relies on the output of `embeddingLevels.js`. Uses `string[i]` (e.g., line 29) and assumes indices correspond to code units.
- **`src/mirroring.js`**: Relies on the output of `embeddingLevels.js`. Uses `string[i]` (e.g., line 41) and assumes indices correspond to code units.
- **`src/charTypes.js`**: The `getBidiCharType` function itself correctly uses `codePointAt(0)`, but it's called with incorrect single code units from `embeddingLevels.js`.

## 3. Step-by-Step Fix Strategy

**Important Note:** Based on previous attempts, modifying the core iteration logic to use code points while maintaining perfect compatibility with existing tests can be challenging. The following steps must be implemented with extreme caution, taking **very small, incremental changes**. After *each* small modification (even within a single step listed below), the **full test suite must be run**. If any test fails, the change must be reverted, and the approach re-evaluated before proceeding.

1.  **Modify `src/embeddingLevels.js` - Initial Code Point Processing:**
    *   **(Incremental)** Introduce code point iteration (e.g., using `Array.from(string)`). **Test.**
    *   **(Incremental)** Create and populate the `codePointIndexToCodeUnitIndex` and `codeUnitIndexToCodePointIndex` mappings. **Test.**
    *   **(Incremental)** Determine `numCodePoints`. **Test.**
    *   **(Incremental)** Initialize `charTypes` and `embedLevels` using `numCodePoints`. **Test.**
    *   **(Incremental)** Modify the initial loop to call `getBidiCharType()` with the full character and store in `charTypes` using the code point index. **Test.**

2.  **Modify `src/embeddingLevels.js` - Algorithm Adaptation:**
    *   **(Incremental)** Review and adapt *one* subsequent loop or array access at a time to use code point indices. **Test after each adaptation.**
    *   **(Incremental)** Pay extremely close attention to relative indexing logic (`i + 1`, etc.) and adapt carefully. **Test.**

3.  **Adapt Helper Functions (`determineAutoEmbedLevel`, `indexOfMatchingPDI`)**:
    *   **(Incremental)** Adapt *one* helper function at a time, ensuring correct code point handling. **Test after each function adaptation.**

4.  **Adjust Return Values/API Compatibility:**
    *   **(Incremental)** Implement the transformation of the `levels` array back to code unit indexing. **Test.**
    *   **(Incremental)** Verify and adjust the `paragraphs` index generation if needed. **Test.**
    *   **(Incremental)** Adjust `isolationPairs` index storage. **Test.**

5.  **Verify Dependent Functions (`getReorderSegments`, `getMirroredCharactersMap`):**
    *   **(Incremental)** Modify character access in `getReorderSegments` (e.g., for trailing types) to use code points. **Test.**
    *   **(Incremental)** Modify character access in `getMirroredCharactersMap` to use code points. **Test.**
    *   **(Incremental)** Verify any other internal logic in these functions. **Test.**

6.  **Testing:**
    *   Run all existing tests in `./test/` *frequently* throughout the process (as noted above). They **must** pass without modification after each successful incremental step.
    *   *Only after* all modifications are complete and all existing tests pass, add the new test cases specifically targeting multibyte characters (See Section 4). Run all tests again.

## 4. Proposed Additional Test Cases

Add tests to `test/bidiconformance.js` or a new dedicated test file:

- **Basic Multibyte:** `A challenging challenge 🤪!` (LTR base)
- **Multibyte RTL:** `سلام 🙂 خوبی؟` (RTL base)
- **Mixed Multibyte:** `ABC 🙂 123 שלום 🥳 XYZ` (Auto/LTR base)
- **Surrogate Pair at Start/End:** `🥳ABC`, `ABC🥳`
- **Adjacent Surrogate Pairs:** `🤪🥳`
- **Multibyte within Isolates:** `A [RLI]🥳[PDI] B`
- **Multibyte with Numerals:** `123 🙂 456`
- **Multibyte with Brackets:** `(🥳)`
- **Complex Script Characters:** Test with Devanagari, Thai, CJK characters known to have specific Bidi properties, including those outside the BMP if applicable. Example: `Text with देवनागरी and 😀 emoji.`

These tests should verify:
- Correct `embeddingLevels` for each code unit.
- Correct `paragraphs` detection and levels.
- Correct reordering (visual order).
- Correct mirroring. 