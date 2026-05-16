const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const { db, nowIso } = require('../../db/sqlite');

const SCHEMA_VERSION = 'provider-vault.v1';
const RUNTIME_DIR = path.join(__dirname, '..', '..', '.runtime');
const VAULT_KEY_PATH = path.join(RUNTIME_DIR, 'provider_vault.key');
const DEFAULT_VERTEX_SERVICE_ACCOUNT_UPLOAD_PATH = path.join(RUNTIME_DIR, 'vertex-service-account.json');
const DEFAULT_VERTEX_PROJECT_ID = 'project-be35f944-1782-4f27-86f';
const DEFAULT_VERTEX_LOCATION = 'us-central1';
const DEFAULT_VERTEX_IMAGEN_MODEL = 'imagen-3.0-generate-001';
const DEFAULT_VERTEX_GEMINI_FAST_MODEL = 'gemini-2.5-flash';
const DEFAULT_VERTEX_GEMINI_PRO_MODEL = 'gemini-2.5-pro';
const DEFAULT_VERTEX_CLAUDE_MODEL = 'claude-3-5-sonnet-v2@20241022';

const PROVIDER_DEFINITIONS = Object.freeze([
  {
    id: 'google',
    displayName: 'Google Vertex AI',
    providerAdapter: 'google',
    credentialId: 'google.vertex_service_account_path',
    secretType: 'service_account_path',
    envKeys: ['VERTEX_SERVICE_ACCOUNT_JSON_PATH', 'GOOGLE_APPLICATION_CREDENTIALS'],
    supportedModelIds: ['google/nano-banana-2', 'google/nano-banana-pro', 'google/imagen-3-text-only']
  },
  {
    id: 'fal',
    displayName: 'fal.ai Image Hub',
    providerAdapter: 'fal',
    credentialId: 'fal.api_key',
    secretType: 'api_token',
    envKeys: ['FAL_KEY'],
    supportedModelIds: [
      'openai/gpt-image-2',
      'openai/gpt-image-1.5',
      'black-forest-labs/flux-2-pro',
      'black-forest-labs/flux-2-max',
      'bytedance/seedream-5-lite',
      'fal/qwen-image-2-edit'
    ]
  },
  {
    id: 'studio-gemini',
    displayName: 'Studio Pulse Gemini',
    providerAdapter: 'google',
    credentialId: 'studio_pulse.gemini_api_key',
    secretType: 'api_key',
    envKeys: ['GEMINI_API_KEY', 'GOOGLE_API_KEY'],
    supportedModelIds: ['gemini text', 'legacy /api/gemini/image']
  }
]);

const SETTINGS = Object.freeze({
  falGptImage2Model: 'fal.gpt_image_2_model',
  falGptImage15Model: 'fal.gpt_image_1_5_model',
  falFlux2ProModel: 'fal.flux_2_pro_model',
  falFlux2MaxModel: 'fal.flux_2_max_model',
  falSeedreamTextModel: 'fal.seedream_text_model',
  falSeedreamEditModel: 'fal.seedream_edit_model',
  falUtilityEditModel: 'fal.utility_edit_model',
  usdZarRate: 'settings.usd_zar_rate',
  vertexProjectId: 'google.vertex_project_id',
  vertexLocation: 'google.vertex_location',
  vertexImagenModel: 'google.vertex_imagen_model',
  vertexGeminiFastModel: 'google.vertex_gemini_fast_model',
  vertexGeminiProModel: 'google.vertex_gemini_pro_model',
  vertexClaudeModel: 'google.vertex_claude_model'
});

const LEGACY_UNSHOWN_CREDENTIAL_IDS = Object.freeze([
  'google.api_key',
  'openai.api_key',
  'openai.image_model',
  'replicate.api_token',
  'replicate.gpt_image_2_model',
  'replicate.gpt_image_1_5_model'
]);
const PROVIDER_STATUS_CACHE_TTL_MS = 15000;
let providerStatusCache = {
  fingerprint: '',
  expiresAt: 0,
  value: null
};

function ensureProviderCredentialTable() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS provider_credentials (
      id TEXT PRIMARY KEY,
      provider_adapter TEXT NOT NULL,
      secret_type TEXT NOT NULL,
      label TEXT,
      encrypted_value TEXT NOT NULL,
      masked_value TEXT,
      enabled INTEGER NOT NULL DEFAULT 1,
      metadata_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_provider_credentials_adapter ON provider_credentials(provider_adapter);
    CREATE INDEX IF NOT EXISTS idx_provider_credentials_enabled ON provider_credentials(enabled);
  `);
}

ensureProviderCredentialTable();

const statements = {
  upsert: db.prepare(`
    INSERT INTO provider_credentials (
      id, provider_adapter, secret_type, label, encrypted_value, masked_value, enabled, metadata_json, created_at, updated_at
    ) VALUES (
      @id, @provider_adapter, @secret_type, @label, @encrypted_value, @masked_value, @enabled, @metadata_json, @created_at, @updated_at
    )
    ON CONFLICT(id) DO UPDATE SET
      provider_adapter = excluded.provider_adapter,
      secret_type = excluded.secret_type,
      label = excluded.label,
      encrypted_value = excluded.encrypted_value,
      masked_value = excluded.masked_value,
      enabled = excluded.enabled,
      metadata_json = excluded.metadata_json,
      updated_at = excluded.updated_at
  `),
  get: db.prepare(`SELECT * FROM provider_credentials WHERE id = ?`),
  list: db.prepare(`SELECT * FROM provider_credentials ORDER BY provider_adapter ASC, id ASC`),
  delete: db.prepare(`DELETE FROM provider_credentials WHERE id = ?`)
};

function ensureVaultSecret() {
  const fromEnv = String(process.env.SILVA_PROVIDER_VAULT_KEY || '').trim();
  if (fromEnv) return fromEnv;
  if (!fs.existsSync(RUNTIME_DIR)) fs.mkdirSync(RUNTIME_DIR, { recursive: true });
  if (!fs.existsSync(VAULT_KEY_PATH)) {
    fs.writeFileSync(VAULT_KEY_PATH, crypto.randomBytes(32).toString('hex'), { mode: 0o600 });
  }
  return fs.readFileSync(VAULT_KEY_PATH, 'utf8').trim();
}

function vaultKey() {
  return crypto.createHash('sha256').update(ensureVaultSecret()).digest();
}

function encryptSecret(value) {
  const text = String(value || '');
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', vaultKey(), iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString('base64')}:${tag.toString('base64')}:${encrypted.toString('base64')}`;
}

function decryptSecret(value) {
  const text = String(value || '');
  if (!text.startsWith('v1:')) return text;
  const [, ivRaw, tagRaw, encryptedRaw] = text.split(':');
  const decipher = crypto.createDecipheriv('aes-256-gcm', vaultKey(), Buffer.from(ivRaw, 'base64'));
  decipher.setAuthTag(Buffer.from(tagRaw, 'base64'));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedRaw, 'base64')),
    decipher.final()
  ]).toString('utf8');
}

function maskSecret(value, fallback = 'configured') {
  const text = String(value || '').trim();
  if (!text) return '';
  if (text.length <= 8) return `${text.slice(0, 2)}...${text.slice(-2)}`;
  return `${text.slice(0, 4)}...${text.slice(-4)}`;
}

function maskPath(value) {
  const text = String(value || '').trim();
  if (!text) return '';
  const base = path.basename(text);
  return base ? `.../${base}` : 'configured path';
}

function ensureRuntimeDir() {
  if (!fs.existsSync(RUNTIME_DIR)) fs.mkdirSync(RUNTIME_DIR, { recursive: true });
}

function vertexServiceAccountUploadPath() {
  return String(process.env.SILVA_VERTEX_SERVICE_ACCOUNT_UPLOAD_PATH || '').trim() || DEFAULT_VERTEX_SERVICE_ACCOUNT_UPLOAD_PATH;
}

function parseJson(value, fallback = {}) {
  if (typeof value !== 'string') return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function rowToPublic(row) {
  if (!row) return null;
  return {
    id: String(row.id || ''),
    providerAdapter: String(row.provider_adapter || ''),
    secretType: String(row.secret_type || ''),
    label: String(row.label || ''),
    maskedValue: String(row.masked_value || ''),
    enabled: row.enabled !== 0,
    metadata: parseJson(row.metadata_json, {}),
    createdAt: row.created_at || '',
    updatedAt: row.updated_at || ''
  };
}

function rowToSecret(row) {
  if (!row || row.enabled === 0) return '';
  try {
    return decryptSecret(row.encrypted_value);
  } catch {
    return '';
  }
}

function providerById(id) {
  return PROVIDER_DEFINITIONS.find(item => item.id === id) || null;
}

function definitionForCredential(id) {
  return PROVIDER_DEFINITIONS.find(item => item.credentialId === id) || null;
}

function normalizeCredentialId(input = {}) {
  const explicit = String(input.id || input.credentialId || '').trim();
  const provider = String(input.provider || input.providerAdapter || '').trim().toLowerCase();
  const secretType = String(input.secretType || input.type || '').trim().toLowerCase();

  if (explicit && [
    'google.api_key',
    'google.vertex_service_account_path',
    'google.vertex_project_id',
    'google.vertex_location',
    'google.vertex_imagen_model',
    'google.vertex_gemini_fast_model',
    'google.vertex_gemini_pro_model',
    'openai.api_key',
    'openai.image_model',
    'fal.api_key',
    'fal.gpt_image_2_model',
    'fal.gpt_image_1_5_model',
    'fal.flux_2_pro_model',
    'fal.flux_2_max_model',
    'fal.seedream_text_model',
    'fal.seedream_edit_model',
    'fal.utility_edit_model',
    'replicate.gpt_image_2_model',
    'replicate.gpt_image_1_5_model',
    'replicate.api_token',
    'settings.usd_zar_rate',
    'studio_pulse.gemini_api_key'
  ].includes(explicit)) {
    return explicit;
  }

  if (provider === 'google' && (secretType === 'vertex_project_id' || secretType === 'project_id' || secretType === 'project')) return SETTINGS.vertexProjectId;
  if (provider === 'google' && (secretType === 'vertex_location' || secretType === 'location' || secretType === 'region')) return SETTINGS.vertexLocation;
  if (provider === 'google' && (secretType === 'vertex_imagen_model' || secretType === 'imagen_model')) return SETTINGS.vertexImagenModel;
  if (provider === 'google' && (secretType === 'vertex_gemini_fast_model' || secretType === 'gemini_fast_model')) return SETTINGS.vertexGeminiFastModel;
  if (provider === 'google' && (secretType === 'vertex_gemini_pro_model' || secretType === 'gemini_pro_model')) return SETTINGS.vertexGeminiProModel;
  if (provider === 'google' && (secretType === 'vertex_claude_model' || secretType === 'claude_model' || secretType === 'model_garden_claude_model')) return SETTINGS.vertexClaudeModel;
  if (provider === 'google' && (secretType === 'service_account_json' || secretType === 'json' || secretType === 'key_json')) return 'google.vertex_service_account_path';
  if (provider === 'google' && (!secretType || secretType === 'service_account_path' || secretType === 'service_account_json_path' || secretType === 'path' || secretType === 'key_file' || secretType === 'keyfilename')) return 'google.vertex_service_account_path';
  if (provider === 'google' && (secretType === 'api_key' || secretType === 'key')) return 'google.api_key';
  if (provider === 'fal' && (secretType === 'gpt_image_2_model' || secretType === 'gpt-image-2' || secretType === 'gpt_image_2')) return SETTINGS.falGptImage2Model;
  if (provider === 'fal' && (secretType === 'gpt_image_1_5_model' || secretType === 'gpt-image-1.5' || secretType === 'gpt_image_15' || secretType === 'gpt_image_1_5')) return SETTINGS.falGptImage15Model;
  if (provider === 'fal' && (secretType === 'flux_2_pro_model' || secretType === 'flux-2-pro')) return SETTINGS.falFlux2ProModel;
  if (provider === 'fal' && (secretType === 'flux_2_max_model' || secretType === 'flux-2-max')) return SETTINGS.falFlux2MaxModel;
  if (provider === 'fal' && (secretType === 'seedream_text_model' || secretType === 'seedream-text')) return SETTINGS.falSeedreamTextModel;
  if (provider === 'fal' && (secretType === 'seedream_edit_model' || secretType === 'seedream-edit')) return SETTINGS.falSeedreamEditModel;
  if (provider === 'fal' && (secretType === 'utility_edit_model' || secretType === 'qwen_image_2_edit' || secretType === 'qwen-image-2-edit')) return SETTINGS.falUtilityEditModel;
  if (provider === 'openai' && (secretType === 'image_model' || secretType === 'model_override' || secretType === 'model')) return 'openai.image_model';
  if (provider === 'openai' && (!secretType || secretType === 'api_key' || secretType === 'key')) return 'openai.api_key';
  if (provider === 'fal' && (!secretType || secretType === 'api_token' || secretType === 'api_key' || secretType === 'token' || secretType === 'key')) return 'fal.api_key';
  if (provider === 'replicate' && (!secretType || secretType === 'api_token' || secretType === 'api_key' || secretType === 'token' || secretType === 'key')) return 'replicate.api_token';
  if ((provider === 'settings' || provider === 'cost') && (secretType === 'usd_zar_rate' || secretType === 'rate')) return 'settings.usd_zar_rate';
  if ((provider === 'studio-gemini' || provider === 'studio_pulse' || provider === 'pulse') && (!secretType || secretType === 'api_key' || secretType === 'key')) return 'studio_pulse.gemini_api_key';
  if (!provider && (secretType === 'usd_zar_rate' || Object.prototype.hasOwnProperty.call(input, 'usdZarRate'))) return 'settings.usd_zar_rate';

  return '';
}

function descriptorForId(id) {
  const def = definitionForCredential(id);
  if (def) return {
    providerAdapter: def.providerAdapter,
    secretType: def.secretType,
    label: def.displayName
  };
  if (id === SETTINGS.vertexProjectId) return {
    providerAdapter: 'google',
    secretType: 'vertex_project_id',
    label: 'Vertex AI project ID'
  };
  if (id === SETTINGS.vertexLocation) return {
    providerAdapter: 'google',
    secretType: 'vertex_location',
    label: 'Vertex AI location'
  };
  if (id === SETTINGS.vertexImagenModel) return {
    providerAdapter: 'google',
    secretType: 'vertex_model',
    label: 'Vertex Imagen model'
  };
  if (id === SETTINGS.vertexGeminiFastModel) return {
    providerAdapter: 'google',
    secretType: 'vertex_model',
    label: 'Vertex Gemini fast model'
  };
  if (id === SETTINGS.vertexGeminiProModel) return {
    providerAdapter: 'google',
    secretType: 'vertex_model',
    label: 'Vertex Gemini pro model'
  };
  if (id === SETTINGS.vertexClaudeModel) return {
    providerAdapter: 'google',
    secretType: 'vertex_model',
    label: 'Vertex Claude Model Garden model'
  };
  if (id === SETTINGS.falGptImage2Model) return {
    providerAdapter: 'fal',
    secretType: 'model_slug',
    label: 'fal.ai GPT Image 2 endpoint'
  };
  if (id === SETTINGS.falGptImage15Model) return {
    providerAdapter: 'fal',
    secretType: 'model_slug',
    label: 'fal.ai GPT Image 1.5 endpoint'
  };
  if (id === SETTINGS.falFlux2ProModel) return {
    providerAdapter: 'fal',
    secretType: 'model_slug',
    label: 'fal.ai FLUX 2 Pro endpoint'
  };
  if (id === SETTINGS.falFlux2MaxModel) return {
    providerAdapter: 'fal',
    secretType: 'model_slug',
    label: 'fal.ai FLUX 2 Max endpoint'
  };
  if (id === SETTINGS.falSeedreamTextModel) return {
    providerAdapter: 'fal',
    secretType: 'model_slug',
    label: 'fal.ai Seedream text endpoint'
  };
  if (id === SETTINGS.falSeedreamEditModel) return {
    providerAdapter: 'fal',
    secretType: 'model_slug',
    label: 'fal.ai Seedream edit endpoint'
  };
  if (id === SETTINGS.falUtilityEditModel) return {
    providerAdapter: 'fal',
    secretType: 'model_slug',
    label: 'fal.ai utility edit endpoint'
  };
  if (id === 'replicate.gpt_image_2_model') return {
    providerAdapter: 'replicate',
    secretType: 'model_slug',
    label: 'Legacy Replicate GPT Image 2 model slug'
  };
  if (id === 'replicate.gpt_image_1_5_model') return {
    providerAdapter: 'replicate',
    secretType: 'model_slug',
    label: 'Legacy Replicate GPT Image 1.5 model slug'
  };
  if (id === 'openai.api_key') return {
    providerAdapter: 'openai',
    secretType: 'api_key',
    label: 'Legacy unused OpenAI key'
  };
  if (id === 'openai.image_model') return {
    providerAdapter: 'openai',
    secretType: 'image_model',
    label: 'Legacy OpenAI image model override'
  };
  if (id === SETTINGS.usdZarRate) return {
    providerAdapter: 'settings',
    secretType: 'usd_zar_rate',
    label: 'USD to ZAR rate'
  };
  return null;
}

function providerStatusFingerprint(env = process.env) {
  return [
    String(env.VERTEX_AUTH_MODE || ''),
    String(env.VERTEX_SERVICE_ACCOUNT_JSON_PATH || ''),
    String(env.GOOGLE_APPLICATION_CREDENTIALS || ''),
    String(env.FAL_KEY ? 'fal' : ''),
    String(env.GEMINI_API_KEY ? 'gemini' : ''),
    String(env.GOOGLE_API_KEY ? 'google-api' : ''),
    String(env.USD_ZAR_RATE || ''),
    String(env.VERTEX_PROJECT_ID || ''),
    String(env.VERTEX_LOCATION || ''),
    String(env.VERTEX_IMAGEN_MODEL || ''),
    String(env.VERTEX_GEMINI_FAST_MODEL || ''),
    String(env.VERTEX_GEMINI_PRO_MODEL || ''),
    String(env.VERTEX_CLAUDE_MODEL || ''),
    String(env.FAL_GPT_IMAGE_2_MODEL || ''),
    String(env.FAL_GPT_IMAGE_1_5_MODEL || ''),
    String(env.FAL_FLUX_2_PRO_MODEL || ''),
    String(env.FAL_FLUX_2_MAX_MODEL || ''),
    String(env.FAL_SEEDREAM_TEXT_MODEL || ''),
    String(env.FAL_SEEDREAM_EDIT_MODEL || ''),
    String(env.FAL_UTILITY_EDIT_MODEL || ''),
    String(statements.list.all().length)
  ].join('|');
}

function invalidateProviderStatusCache() {
  providerStatusCache = {
    fingerprint: '',
    expiresAt: 0,
    value: null
  };
}

function saveProviderCredential(input = {}) {
  const id = normalizeCredentialId(input);
  const descriptor = descriptorForId(id);
  if (!id || !descriptor) {
    const err = new Error('Unknown provider credential target.');
    err.code = 'UNKNOWN_PROVIDER_CREDENTIAL';
    err.statusCode = 400;
    throw err;
  }

  const rawValue = input.value ?? input.apiKey ?? input.token ?? input.model ?? input.modelOverride ?? input.usdZarRate ?? '';
  const value = String(rawValue || '').trim();
  if (!value) {
    const err = new Error('Credential value is required.');
    err.code = 'PROVIDER_CREDENTIAL_REQUIRED';
    err.statusCode = 400;
    throw err;
  }
  if (id === SETTINGS.usdZarRate) {
    const rate = Number.parseFloat(value);
    if (!Number.isFinite(rate) || rate <= 0) {
      const err = new Error('USD_ZAR_RATE must be a positive number.');
      err.code = 'INVALID_USD_ZAR_RATE';
      err.statusCode = 400;
      throw err;
    }
  }

  const existing = statements.get.get(id);
  const ts = nowIso();
  const publicValue = descriptor.secretType === 'service_account_path'
    ? maskPath(value)
    : (descriptor.secretType === 'image_model'
      || descriptor.secretType === 'model_slug'
      || descriptor.secretType === 'usd_zar_rate'
      || descriptor.secretType === 'vertex_project_id'
      || descriptor.secretType === 'vertex_location'
      || descriptor.secretType === 'vertex_model'
        ? value
        : maskSecret(value));
  statements.upsert.run({
    id,
    provider_adapter: descriptor.providerAdapter,
    secret_type: descriptor.secretType,
    label: String(input.label || descriptor.label || id),
    encrypted_value: encryptSecret(value),
    masked_value: publicValue,
    enabled: input.enabled === false ? 0 : 1,
    metadata_json: JSON.stringify(input.metadata && typeof input.metadata === 'object' ? input.metadata : {}),
    created_at: existing?.created_at || ts,
    updated_at: ts
  });
  invalidateProviderStatusCache();
  return rowToPublic(statements.get.get(id));
}

function parseServiceAccountJson(rawValue) {
  const raw = String(rawValue || '').trim();
  if (!raw) {
    const err = new Error('Paste the Google service-account JSON key first.');
    err.code = 'PROVIDER_CREDENTIAL_REQUIRED';
    err.statusCode = 400;
    throw err;
  }
  let parsed = null;
  try {
    parsed = JSON.parse(raw);
  } catch {
    const err = new Error('That does not look like valid service-account JSON.');
    err.code = 'INVALID_SERVICE_ACCOUNT_JSON';
    err.statusCode = 400;
    throw err;
  }
  const missing = ['type', 'project_id', 'private_key', 'client_email'].filter(key => !String(parsed[key] || '').trim());
  if (parsed.type !== 'service_account' || missing.length) {
    const err = new Error('Service-account JSON must include type, project_id, private_key, and client_email.');
    err.code = 'INVALID_SERVICE_ACCOUNT_JSON';
    err.statusCode = 400;
    throw err;
  }
  return parsed;
}

function saveVertexServiceAccountJson(input = {}) {
  const rawValue = input.value ?? input.json ?? input.serviceAccountJson ?? '';
  const parsed = parseServiceAccountJson(rawValue);
  const targetPath = vertexServiceAccountUploadPath();
  const targetDir = path.dirname(targetPath);
  ensureRuntimeDir();
  if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
  fs.writeFileSync(targetPath, `${JSON.stringify(parsed, null, 2)}\n`, { mode: 0o600 });
  try { fs.chmodSync(targetPath, 0o600); } catch (_) {}
  const credential = saveProviderCredential({
    provider: 'google',
    secretType: 'service_account_path',
    value: targetPath,
    label: 'Google Vertex AI service-account JSON'
  });
  if (parsed.project_id) {
    saveProviderCredential({
      provider: 'google',
      secretType: 'vertex_project_id',
      value: parsed.project_id,
      label: 'Vertex AI project ID'
    });
  }
  return credential;
}

function deleteProviderCredential(id) {
  const safeId = normalizeCredentialId({ id });
  if (!safeId) return false;
  const result = statements.delete.run(safeId);
  if (result.changes > 0) invalidateProviderStatusCache();
  return result.changes > 0;
}

function getSecret(id) {
  return rowToSecret(statements.get.get(id));
}

function envConfigured(env = process.env, keys = []) {
  return (keys || []).find(key => String(env[key] || '').trim()) || '';
}

function usesVertexApplicationDefaultCredentials(env = process.env) {
  const mode = String(env.VERTEX_AUTH_MODE || '').trim().toLowerCase();
  return mode === 'adc' || mode === 'application-default';
}

function configuredSourceFor(def, env = process.env) {
  const vaultRow = statements.get.get(def.credentialId);
  const vaultValue = rowToSecret(vaultRow);
  if (vaultValue) {
    if (def.secretType === 'service_account_path') {
      const exists = fs.existsSync(vaultValue);
      return {
        configured: exists,
        source: 'vault',
        maskedValue: vaultRow.masked_value || maskPath(vaultValue),
        updatedAt: vaultRow.updated_at || '',
        status: exists ? 'ready' : 'path missing'
      };
    }
    return {
      configured: true,
      source: 'vault',
      maskedValue: vaultRow.masked_value || maskSecret(vaultValue),
      updatedAt: vaultRow.updated_at || ''
    };
  }
  if (def.id === 'google' && usesVertexApplicationDefaultCredentials(env)) {
    return {
      configured: true,
      source: 'adc',
      maskedValue: 'Application Default Credentials',
      updatedAt: '',
      status: 'ready'
    };
  }
  const envKey = envConfigured(env, def.envKeys);
  if (envKey) {
    if (def.secretType === 'service_account_path') {
      const envPath = String(env[envKey] || '').trim();
      const exists = fs.existsSync(envPath);
      return {
        configured: exists,
        source: 'env',
        maskedValue: exists ? maskPath(envPath) : 'server env path set',
        updatedAt: '',
        status: exists ? 'ready' : 'path missing'
      };
    }
    return {
      configured: true,
      source: 'env',
      maskedValue: 'server env configured',
      updatedAt: ''
    };
  }
  return {
    configured: false,
    source: 'missing',
    maskedValue: '',
    updatedAt: ''
  };
}

function providerStatusLabel(configured, explicitStatus = '') {
  return explicitStatus || (configured ? 'ready' : 'missing key');
}

function publicProviderStatus(env = process.env) {
  const fingerprint = providerStatusFingerprint(env);
  if (providerStatusCache.value && providerStatusCache.fingerprint === fingerprint && providerStatusCache.expiresAt > Date.now()) {
    return providerStatusCache.value;
  }
  const rows = statements.list.all()
    .map(rowToPublic)
    .filter(Boolean)
    .filter(row => !LEGACY_UNSHOWN_CREDENTIAL_IDS.includes(row.id));
  const providers = PROVIDER_DEFINITIONS.map(def => {
    const active = configuredSourceFor(def, env);
    return {
      id: def.id,
      displayName: def.displayName,
      providerAdapter: def.providerAdapter,
      credentialId: def.credentialId,
      secretType: def.secretType,
      configured: active.configured,
      status: providerStatusLabel(active.configured, active.status),
      source: active.source,
      maskedValue: active.maskedValue,
      updatedAt: active.updatedAt,
      supportedModelIds: def.supportedModelIds
    };
  });

  const falGptImage2ModelVault = getSecret(SETTINGS.falGptImage2Model);
  const falGptImage15ModelVault = getSecret(SETTINGS.falGptImage15Model);
  const falFlux2ProModelVault = getSecret(SETTINGS.falFlux2ProModel);
  const falFlux2MaxModelVault = getSecret(SETTINGS.falFlux2MaxModel);
  const falSeedreamTextModelVault = getSecret(SETTINGS.falSeedreamTextModel);
  const falSeedreamEditModelVault = getSecret(SETTINGS.falSeedreamEditModel);
  const falUtilityEditModelVault = getSecret(SETTINGS.falUtilityEditModel);
  const usdZarRateVault = getSecret(SETTINGS.usdZarRate);
  const vertexProjectIdVault = getSecret(SETTINGS.vertexProjectId);
  const vertexLocationVault = getSecret(SETTINGS.vertexLocation);
  const vertexImagenModelVault = getSecret(SETTINGS.vertexImagenModel);
  const vertexGeminiFastModelVault = getSecret(SETTINGS.vertexGeminiFastModel);
  const vertexGeminiProModelVault = getSecret(SETTINGS.vertexGeminiProModel);
  const vertexClaudeModelVault = getSecret(SETTINGS.vertexClaudeModel);
  const usdZarRateEnv = String(env.USD_ZAR_RATE || '').trim();
  const vertexProjectIdEnv = String(env.VERTEX_PROJECT_ID || '').trim();
  const vertexLocationEnv = String(env.VERTEX_LOCATION || '').trim();
  const vertexImagenModelEnv = String(env.VERTEX_IMAGEN_MODEL || '').trim();
  const vertexGeminiFastModelEnv = String(env.VERTEX_GEMINI_FAST_MODEL || '').trim();
  const vertexGeminiProModelEnv = String(env.VERTEX_GEMINI_PRO_MODEL || '').trim();
  const vertexClaudeModelEnv = String(env.VERTEX_CLAUDE_MODEL || '').trim();
  const falGptImage2ModelEnv = String(env.FAL_GPT_IMAGE_2_MODEL || '').trim();
  const falGptImage15ModelEnv = String(env.FAL_GPT_IMAGE_1_5_MODEL || '').trim();
  const falFlux2ProModelEnv = String(env.FAL_FLUX_2_PRO_MODEL || '').trim();
  const falFlux2MaxModelEnv = String(env.FAL_FLUX_2_MAX_MODEL || '').trim();
  const falSeedreamTextModelEnv = String(env.FAL_SEEDREAM_TEXT_MODEL || '').trim();
  const falSeedreamEditModelEnv = String(env.FAL_SEEDREAM_EDIT_MODEL || '').trim();
  const falUtilityEditModelEnv = String(env.FAL_UTILITY_EDIT_MODEL || '').trim();

  const status = {
    ok: true,
    schemaVersion: SCHEMA_VERSION,
    providers,
    byAdapter: providers.reduce((acc, item) => {
      if (!acc[item.providerAdapter] || item.id === item.providerAdapter) acc[item.providerAdapter] = item;
      return acc;
    }, {}),
    credentials: rows,
    settings: {
      falGptImage2Model: {
        configured: Boolean(falGptImage2ModelVault || falGptImage2ModelEnv),
        value: falGptImage2ModelVault || falGptImage2ModelEnv || '',
        source: falGptImage2ModelVault ? 'vault' : (falGptImage2ModelEnv ? 'env' : 'default'),
        defaultValue: 'openai/gpt-image-2'
      },
      falGptImage15Model: {
        configured: Boolean(falGptImage15ModelVault || falGptImage15ModelEnv),
        value: falGptImage15ModelVault || falGptImage15ModelEnv || '',
        source: falGptImage15ModelVault ? 'vault' : (falGptImage15ModelEnv ? 'env' : 'default'),
        defaultValue: 'fal-ai/gpt-image-1.5'
      },
      falFlux2ProModel: {
        configured: Boolean(falFlux2ProModelVault || falFlux2ProModelEnv),
        value: falFlux2ProModelVault || falFlux2ProModelEnv || '',
        source: falFlux2ProModelVault ? 'vault' : (falFlux2ProModelEnv ? 'env' : 'default'),
        defaultValue: 'fal-ai/flux-2-pro'
      },
      falFlux2MaxModel: {
        configured: Boolean(falFlux2MaxModelVault || falFlux2MaxModelEnv),
        value: falFlux2MaxModelVault || falFlux2MaxModelEnv || '',
        source: falFlux2MaxModelVault ? 'vault' : (falFlux2MaxModelEnv ? 'env' : 'default'),
        defaultValue: 'fal-ai/flux-2-max'
      },
      falSeedreamTextModel: {
        configured: Boolean(falSeedreamTextModelVault || falSeedreamTextModelEnv),
        value: falSeedreamTextModelVault || falSeedreamTextModelEnv || '',
        source: falSeedreamTextModelVault ? 'vault' : (falSeedreamTextModelEnv ? 'env' : 'default'),
        defaultValue: 'fal-ai/bytedance/seedream/v5/lite/text-to-image'
      },
      falSeedreamEditModel: {
        configured: Boolean(falSeedreamEditModelVault || falSeedreamEditModelEnv),
        value: falSeedreamEditModelVault || falSeedreamEditModelEnv || '',
        source: falSeedreamEditModelVault ? 'vault' : (falSeedreamEditModelEnv ? 'env' : 'default'),
        defaultValue: 'fal-ai/bytedance/seedream/v5/lite/edit'
      },
      falUtilityEditModel: {
        configured: Boolean(falUtilityEditModelVault || falUtilityEditModelEnv),
        value: falUtilityEditModelVault || falUtilityEditModelEnv || '',
        source: falUtilityEditModelVault ? 'vault' : (falUtilityEditModelEnv ? 'env' : 'default'),
        defaultValue: 'fal-ai/qwen-image-2/edit'
      },
      usdZarRate: {
        configured: Boolean(usdZarRateVault || usdZarRateEnv),
        value: usdZarRateVault || usdZarRateEnv || '',
        source: usdZarRateVault ? 'vault' : (usdZarRateEnv ? 'env' : 'approximate-default'),
        defaultValue: '18.5'
      },
      vertex: {
        projectId: {
          configured: Boolean(vertexProjectIdVault || vertexProjectIdEnv),
          value: vertexProjectIdVault || vertexProjectIdEnv || DEFAULT_VERTEX_PROJECT_ID,
          source: vertexProjectIdVault ? 'vault' : (vertexProjectIdEnv ? 'env' : 'default'),
          defaultValue: DEFAULT_VERTEX_PROJECT_ID
        },
        location: {
          configured: Boolean(vertexLocationVault || vertexLocationEnv),
          value: vertexLocationVault || vertexLocationEnv || DEFAULT_VERTEX_LOCATION,
          source: vertexLocationVault ? 'vault' : (vertexLocationEnv ? 'env' : 'default'),
          defaultValue: DEFAULT_VERTEX_LOCATION
        },
        imagenModel: {
          configured: Boolean(vertexImagenModelVault || vertexImagenModelEnv),
          value: vertexImagenModelVault || vertexImagenModelEnv || DEFAULT_VERTEX_IMAGEN_MODEL,
          source: vertexImagenModelVault ? 'vault' : (vertexImagenModelEnv ? 'env' : 'default'),
          defaultValue: DEFAULT_VERTEX_IMAGEN_MODEL
        },
        geminiFastModel: {
          configured: Boolean(vertexGeminiFastModelVault || vertexGeminiFastModelEnv),
          value: vertexGeminiFastModelVault || vertexGeminiFastModelEnv || DEFAULT_VERTEX_GEMINI_FAST_MODEL,
          source: vertexGeminiFastModelVault ? 'vault' : (vertexGeminiFastModelEnv ? 'env' : 'default'),
          defaultValue: DEFAULT_VERTEX_GEMINI_FAST_MODEL
        },
        geminiProModel: {
          configured: Boolean(vertexGeminiProModelVault || vertexGeminiProModelEnv),
          value: vertexGeminiProModelVault || vertexGeminiProModelEnv || DEFAULT_VERTEX_GEMINI_PRO_MODEL,
          source: vertexGeminiProModelVault ? 'vault' : (vertexGeminiProModelEnv ? 'env' : 'default'),
          defaultValue: DEFAULT_VERTEX_GEMINI_PRO_MODEL
        },
        claudeModel: {
          configured: Boolean(vertexClaudeModelVault || vertexClaudeModelEnv),
          value: vertexClaudeModelVault || vertexClaudeModelEnv || DEFAULT_VERTEX_CLAUDE_MODEL,
          source: vertexClaudeModelVault ? 'vault' : (vertexClaudeModelEnv ? 'env' : 'default'),
          defaultValue: DEFAULT_VERTEX_CLAUDE_MODEL
        }
      }
    }
  };
  providerStatusCache = {
    fingerprint,
    expiresAt: Date.now() + PROVIDER_STATUS_CACHE_TTL_MS,
    value: status
  };
  return status;
}

function readinessForModel(model, env = process.env) {
  const status = publicProviderStatus(env);
  const provider = (status.providers || []).find(item => item.providerAdapter === model?.providerAdapter);
  return {
    configured: Boolean(provider?.configured),
    status: provider?.status || 'missing key',
    source: provider?.source || 'missing',
    maskedValue: provider?.maskedValue || '',
    providerAdapter: model?.providerAdapter || '',
    credentialId: provider?.credentialId || ''
  };
}

function resolveImageProviderEnv(baseEnv = process.env) {
  const env = { ...baseEnv };
  const vertexServiceAccountPath = getSecret('google.vertex_service_account_path');
  const vertexProjectId = getSecret(SETTINGS.vertexProjectId);
  const vertexLocation = getSecret(SETTINGS.vertexLocation);
  const vertexImagenModel = getSecret(SETTINGS.vertexImagenModel);
  const vertexGeminiFastModel = getSecret(SETTINGS.vertexGeminiFastModel);
  const vertexGeminiProModel = getSecret(SETTINGS.vertexGeminiProModel);
  const vertexClaudeModel = getSecret(SETTINGS.vertexClaudeModel);
  const falKey = getSecret('fal.api_key');
  const falGptImage2Model = getSecret(SETTINGS.falGptImage2Model);
  const falGptImage15Model = getSecret(SETTINGS.falGptImage15Model);
  const falFlux2ProModel = getSecret(SETTINGS.falFlux2ProModel);
  const falFlux2MaxModel = getSecret(SETTINGS.falFlux2MaxModel);
  const falSeedreamTextModel = getSecret(SETTINGS.falSeedreamTextModel);
  const falSeedreamEditModel = getSecret(SETTINGS.falSeedreamEditModel);
  const falUtilityEditModel = getSecret(SETTINGS.falUtilityEditModel);
  const usdZarRate = getSecret(SETTINGS.usdZarRate);

  if (vertexServiceAccountPath) env.VERTEX_SERVICE_ACCOUNT_JSON_PATH = vertexServiceAccountPath;
  env.VERTEX_PROJECT_ID = vertexProjectId || env.VERTEX_PROJECT_ID || DEFAULT_VERTEX_PROJECT_ID;
  env.VERTEX_LOCATION = vertexLocation || env.VERTEX_LOCATION || DEFAULT_VERTEX_LOCATION;
  env.VERTEX_IMAGEN_MODEL = vertexImagenModel || env.VERTEX_IMAGEN_MODEL || DEFAULT_VERTEX_IMAGEN_MODEL;
  env.VERTEX_GEMINI_FAST_MODEL = vertexGeminiFastModel || env.VERTEX_GEMINI_FAST_MODEL || DEFAULT_VERTEX_GEMINI_FAST_MODEL;
  env.VERTEX_GEMINI_PRO_MODEL = vertexGeminiProModel || env.VERTEX_GEMINI_PRO_MODEL || DEFAULT_VERTEX_GEMINI_PRO_MODEL;
  env.VERTEX_CLAUDE_MODEL = vertexClaudeModel || env.VERTEX_CLAUDE_MODEL || DEFAULT_VERTEX_CLAUDE_MODEL;
  if (falKey) env.FAL_KEY = falKey;
  if (falGptImage2Model) env.FAL_GPT_IMAGE_2_MODEL = falGptImage2Model;
  if (falGptImage15Model) env.FAL_GPT_IMAGE_1_5_MODEL = falGptImage15Model;
  if (falFlux2ProModel) env.FAL_FLUX_2_PRO_MODEL = falFlux2ProModel;
  if (falFlux2MaxModel) env.FAL_FLUX_2_MAX_MODEL = falFlux2MaxModel;
  if (falSeedreamTextModel) env.FAL_SEEDREAM_TEXT_MODEL = falSeedreamTextModel;
  if (falSeedreamEditModel) env.FAL_SEEDREAM_EDIT_MODEL = falSeedreamEditModel;
  if (falUtilityEditModel) env.FAL_UTILITY_EDIT_MODEL = falUtilityEditModel;
  if (usdZarRate) env.USD_ZAR_RATE = usdZarRate;
  return env;
}

function geminiVaultKeyEntries() {
  const entries = [];
  const add = (id, label, provider = 'gemini') => {
    const apiKey = getSecret(id);
    if (!apiKey) return;
    entries.push({
      label,
      provider,
      model: '',
      apiKey
    });
  };
  add('studio_pulse.gemini_api_key', 'Studio Pulse vault', 'gemini');
  add('google.api_key', 'Legacy Google API-key vault', 'gemini');
  return entries;
}

module.exports = {
  SCHEMA_VERSION,
  DEFAULT_VERTEX_PROJECT_ID,
  DEFAULT_VERTEX_LOCATION,
  DEFAULT_VERTEX_IMAGEN_MODEL,
  DEFAULT_VERTEX_GEMINI_FAST_MODEL,
  DEFAULT_VERTEX_GEMINI_PRO_MODEL,
  DEFAULT_VERTEX_CLAUDE_MODEL,
  PROVIDER_DEFINITIONS,
  SETTINGS,
  deleteProviderCredential,
  geminiVaultKeyEntries,
  getSecret,
  maskSecret,
  normalizeCredentialId,
  providerById,
  publicProviderStatus,
  readinessForModel,
  resolveImageProviderEnv,
  saveProviderCredential,
  saveVertexServiceAccountJson
};
