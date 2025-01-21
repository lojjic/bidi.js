import { getEmbeddingLevels } from './embeddingLevels.js'
import { getReorderSegments, getReorderedIndices, getReorderedString } from './reordering.js'
import { getBidiCharType, getBidiCharTypeName } from './charTypes.js'
import { getMirroredCharacter, getMirroredCharactersMap } from './mirroring.js'
import { closingToOpeningBracket, openingToClosingBracket, getCanonicalBracket } from './brackets.js'

export function bidiFactory() {
    return {
        getEmbeddingLevels,
        getReorderSegments,
        getReorderedIndices,
        getReorderedString,
        getBidiCharType,
        getBidiCharTypeName,
        getMirroredCharacter,
        getMirroredCharactersMap,
        closingToOpeningBracket,
        openingToClosingBracket,
        getCanonicalBracket
    }
}
