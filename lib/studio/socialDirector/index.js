const { CHARACTER_BIBLES, characterName, publicCharacterBibles } = require('./characterBibles');
const { buildRoomDirectorInput, buildRoomDirectorPrompt, SCHEMA_VERSION } = require('./roomDirectorPrompt');
const { socialFallbackFor } = require('./socialDirectorFallback');
const {
  bannedPhraseFound,
  extractJsonObject,
  feelsTaskRouterRisk,
  rawInternalLeakFound,
  repeatedPointRisk,
  validateDirectorOutput
} = require('./socialDirectorValidator');
const { runSocialDirectorTurn } = require('./socialDirector');

module.exports = {
  CHARACTER_BIBLES,
  SCHEMA_VERSION,
  bannedPhraseFound,
  buildRoomDirectorInput,
  buildRoomDirectorPrompt,
  characterName,
  extractJsonObject,
  feelsTaskRouterRisk,
  publicCharacterBibles,
  rawInternalLeakFound,
  repeatedPointRisk,
  runSocialDirectorTurn,
  socialFallbackFor,
  validateDirectorOutput
};
