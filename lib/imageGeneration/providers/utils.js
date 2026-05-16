function providerError(code, message, extra = {}) {
  const err = new Error(message);
  err.code = code;
  err.safeMessage = message;
  Object.assign(err, extra);
  return err;
}

function getFetch(options = {}) {
  const fetchImpl = options.fetchImpl || global.fetch;
  if (typeof fetchImpl !== 'function') {
    throw providerError('FETCH_UNAVAILABLE', 'This Node runtime does not expose fetch for image provider calls.', {
      statusCode: 500
    });
  }
  return fetchImpl;
}

async function fetchJson(fetchImpl, url, options = {}, timeoutMs = 60000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(url, {
      ...options,
      signal: controller.signal
    });
    const text = await response.text();
    let data = null;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = { text };
      }
    }
    return { response, data };
  } catch (err) {
    if (err?.name === 'AbortError') {
      throw providerError('PROVIDER_TIMEOUT', 'Image provider request timed out.', {
        statusCode: 504
      });
    }
    throw providerError('PROVIDER_NETWORK_ERROR', 'Image provider request failed before a response was received.', {
      statusCode: 502,
      causeMessage: String(err?.message || err)
    });
  } finally {
    clearTimeout(timeout);
  }
}

function parseDataUrl(dataUrl) {
  if (!dataUrl || typeof dataUrl !== 'string') return null;
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;
  return {
    mimeType: match[1],
    data: match[2]
  };
}

function normalizeReferenceImages(referenceImages = []) {
  return (Array.isArray(referenceImages) ? referenceImages : [])
    .map((item, index) => {
      const baseMeta = typeof item === 'object' && item
        ? {
            type: item.type || item.role || '',
            label: item.label || item.title || '',
            priority: Number.isFinite(Number(item.priority)) ? Number(item.priority) : index + 1,
            sourceName: item.sourceName || item.name || '',
            referenceId: item.referenceId || item.id || '',
            source: item.source || ''
          }
        : {
            type: '',
            label: '',
            priority: index + 1,
            sourceName: '',
            referenceId: '',
            source: ''
          };
      if (typeof item === 'string') {
        const parsed = parseDataUrl(item);
        return parsed
          ? { ...baseMeta, ...parsed, dataUrl: item, source: baseMeta.source || 'data_url', index }
          : { ...baseMeta, url: item, source: baseMeta.source || 'url', index };
      }
      if (!item || typeof item !== 'object') return null;
      const dataUrl = item.dataUrl || item.imageData || item.src || '';
      const parsed = parseDataUrl(dataUrl);
      if (parsed) return { ...baseMeta, ...parsed, dataUrl, source: baseMeta.source || 'data_url', index };
      if (/^https?:\/\//i.test(String(dataUrl || '').trim())) {
        return { ...baseMeta, url: String(dataUrl).trim(), dataUrl: String(dataUrl).trim(), source: baseMeta.source || 'url', index };
      }
      if (item.data && item.mimeType) {
        return {
          ...baseMeta,
          mimeType: item.mimeType,
          data: item.data,
          dataUrl: `data:${item.mimeType};base64,${item.data}`,
          source: baseMeta.source || 'data_url',
          index
        };
      }
      if (item.url) return { ...baseMeta, url: item.url, source: baseMeta.source || 'url', index };
      return null;
    })
    .filter(Boolean);
}

function dataUrlToBlob(reference) {
  const parsed = reference?.data ? reference : parseDataUrl(reference?.dataUrl || '');
  if (!parsed) {
    throw providerError('REFERENCE_IMAGE_FORMAT_UNSUPPORTED', 'Reference image must be a data URL for this provider call.', {
      statusCode: 400
    });
  }
  const bytes = Buffer.from(parsed.data, 'base64');
  return new Blob([bytes], { type: parsed.mimeType || 'image/png' });
}

function imageExtension(mimeType = 'image/png') {
  if (/jpe?g/i.test(mimeType)) return 'jpg';
  if (/webp/i.test(mimeType)) return 'webp';
  return 'png';
}

function extractImageOutputs(node, out = []) {
  if (!node) return out;
  if (typeof node === 'string') {
    const trimmed = node.trim();
    if (/^https?:\/\//i.test(trimmed)) {
      out.push({ url: trimmed, source: 'url' });
    } else if (/^data:image\//i.test(trimmed)) {
      out.push({ dataUrl: trimmed, source: 'data_url' });
    } else {
      const compact = trimmed.replace(/\s+/g, '');
      if (compact.length > 500 && /^[A-Za-z0-9+/=]+$/.test(compact)) {
        out.push({ dataUrl: `data:image/png;base64,${compact}`, mimeType: 'image/png', source: 'base64' });
      }
    }
    return out;
  }
  if (Array.isArray(node)) {
    for (const item of node) extractImageOutputs(item, out);
    return out;
  }
  if (typeof node === 'object') {
    if (node.b64_json) out.push({ dataUrl: `data:image/png;base64,${node.b64_json}`, mimeType: 'image/png', source: 'base64' });
    if (node.url) out.push({ url: node.url, source: 'url' });
    if (node.inlineData?.data) {
      out.push({
        dataUrl: `data:${node.inlineData.mimeType || 'image/png'};base64,${node.inlineData.data}`,
        mimeType: node.inlineData.mimeType || 'image/png',
        source: 'base64'
      });
    }
    if (node.inline_data?.data) {
      out.push({
        dataUrl: `data:${node.inline_data.mime_type || 'image/png'};base64,${node.inline_data.data}`,
        mimeType: node.inline_data.mime_type || 'image/png',
        source: 'base64'
      });
    }
    if (node.imageBytes) {
      out.push({
        dataUrl: `data:${node.mimeType || 'image/png'};base64,${node.imageBytes}`,
        mimeType: node.mimeType || 'image/png',
        source: 'base64'
      });
    }
    if (node.bytesBase64Encoded) {
      out.push({
        dataUrl: `data:${node.mimeType || 'image/png'};base64,${node.bytesBase64Encoded}`,
        mimeType: node.mimeType || 'image/png',
        source: 'base64'
      });
    }
    for (const value of Object.values(node)) extractImageOutputs(value, out);
  }
  return out;
}

function uniqueImages(images = []) {
  const seen = new Set();
  const out = [];
  for (const image of images) {
    const key = image.dataUrl || image.url;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push({
      index: out.length,
      ...image,
      visible: true
    });
  }
  return out;
}

function safeProviderMessage(data, fallback = 'Image provider request failed.') {
  return String(data?.error?.message || data?.detail || data?.message || data?.error || fallback);
}

function isQuotaLike(status, message = '') {
  return Number(status) === 429 || /quota|rate.?limit|too many requests|free_tier|limit:\s*0/i.test(String(message || ''));
}

function shouldIncludeRaw(env = process.env, options = {}) {
  return Boolean(options.includeRaw) || String(env.IMAGE_PROVIDER_DEBUG || '').trim() === '1';
}

function normalizeAspectRatio(aspectRatio = '') {
  const value = String(aspectRatio || '').trim().toLowerCase();
  if (!value) return '';
  if (['1:1', 'square'].includes(value)) return '1:1';
  if (['16:9', 'landscape', 'horizontal'].includes(value)) return '16:9';
  if (['9:16', 'portrait', 'vertical'].includes(value)) return '9:16';
  if (['4:3', '3:4'].includes(value)) return value;
  return value;
}

module.exports = {
  dataUrlToBlob,
  extractImageOutputs,
  fetchJson,
  getFetch,
  imageExtension,
  isQuotaLike,
  normalizeAspectRatio,
  normalizeReferenceImages,
  parseDataUrl,
  providerError,
  safeProviderMessage,
  shouldIncludeRaw,
  uniqueImages
};
