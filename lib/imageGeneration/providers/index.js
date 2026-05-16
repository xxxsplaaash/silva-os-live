const google = require('./google');
const openai = require('./openai');
const fal = require('./fal');
const legacyReplicate = require('./replicate');

const ADAPTERS = Object.freeze({
  fal,
  google,
  openai
});

function getProviderAdapter(adapterName) {
  return ADAPTERS[String(adapterName || '').trim().toLowerCase()] || null;
}

module.exports = {
  ADAPTERS,
  getProviderAdapter,
  legacyReplicate
};
