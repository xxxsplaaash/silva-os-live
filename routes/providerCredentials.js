const express = require('express');

const {
  deleteProviderCredential,
  publicProviderStatus,
  saveProviderCredential,
  saveVertexServiceAccountJson
} = require('../lib/imageGeneration/providerVault');

const router = express.Router();

function safeCredentialError(err) {
  return {
    statusCode: Number(err?.statusCode || 400) || 400,
    body: {
      ok: false,
      error: String(err?.code || 'provider_credential_error').toLowerCase(),
      message: err?.message || 'Provider credential request failed.'
    }
  };
}

router.get('/status', (req, res) => {
  res.json(publicProviderStatus());
});

router.post('/', (req, res) => {
  try {
    const body = req.body || {};
    const secretType = String(body.secretType || body.type || '').trim().toLowerCase();
    const provider = String(body.provider || body.providerAdapter || '').trim().toLowerCase();
    const credential = provider === 'google' && ['service_account_json', 'json', 'key_json'].includes(secretType)
      ? saveVertexServiceAccountJson(body)
      : saveProviderCredential(body);
    res.json({
      ok: true,
      credential,
      status: publicProviderStatus()
    });
  } catch (err) {
    const normalized = safeCredentialError(err);
    res.status(normalized.statusCode).json(normalized.body);
  }
});

router.delete('/:id', (req, res) => {
  const removed = deleteProviderCredential(req.params.id || '');
  res.json({
    ok: true,
    removed,
    status: publicProviderStatus()
  });
});

module.exports = router;
