/**
 * Break a string into rendered characters (graphemes), 
 * using simpler methods of breaking strings apart doesn't take into account characters with multiple bytes.
 * For instance `'👱🏽‍♂️'.length === 7`
 * @param {string} string - input string
 * @return {string[]} - the string broken down into an array of characters.
 */
export function stringToArray (string) {
  return [...new Intl.Segmenter().segment(string)].map(x => x.segment);
}