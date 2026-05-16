(function(){
  'use strict';

  var ROLE_DEFS = [
    { id: 'primary_face', legacyKey: 'face', type: 'face', label: 'Primary Face', payloadLabel: 'PRIMARY FACE CONTACT SHEET / IDENTITY REFERENCE', priority: 1, activeDefault: true, kind: 'identity_face', guidance: 'Best clear face/contact sheet. This is the face authority.' },
    { id: 'primary_body', legacyKey: 'body', type: 'body', label: 'Primary Body/Build', payloadLabel: 'FULL BODY / BUILD CONTACT SHEET REFERENCE', priority: 2, activeDefault: true, kind: 'identity_body', guidance: 'Full body/build/contact sheet. This is the body authority.' },
    { id: 'profile_side', legacyKey: 'profile', type: 'profile', label: 'Profile/Side', payloadLabel: 'PROFILE / SIDE IDENTITY SUPPORT', priority: 10, activeDefault: true, kind: 'identity_profile', guidance: 'Side angle or three-quarter support to stop face drift.' },
    { id: 'expression_closeups', legacyKey: '', type: 'expression', label: 'Expression Closeups', payloadLabel: 'EXPRESSION / CLOSEUP IDENTITY SUPPORT', priority: 11, activeDefault: true, kind: 'identity_expression', guidance: 'Close expression refs for smile, eyes, and natural facial tension.' },
    { id: 'hair_texture', legacyKey: '', type: 'hair_texture', label: 'Hair/Texture', payloadLabel: 'HAIR / TEXTURE IDENTITY SUPPORT', priority: 12, activeDefault: true, kind: 'identity_texture', guidance: 'Hair shape, texture, glasses, skin detail, and small identity cues.' },
    { id: 'wardrobe', legacyKey: 'outfit', type: 'outfit', label: 'Wardrobe', payloadLabel: 'WARDROBE REFERENCE', priority: 24, activeDefault: false, kind: 'wardrobe_reference', guidance: 'Clothing support only. Identity refs still win.' },
    { id: 'approved_gold', legacyKey: 'gold', type: 'approved_gold', label: 'Approved Gold', payloadLabel: 'APPROVED GOLD OUTPUT - IDENTITY SUPPORT ONLY', priority: 32, activeDefault: false, kind: 'approved_identity_output', guidance: 'A prior approved output. Use cautiously as support, never as a scene copy.' },
    { id: 'rejected_do_not_repeat', legacyKey: 'rejected', type: 'rejected', label: 'Rejected/Do Not Repeat', payloadLabel: 'REJECTED OUTPUT - DO NOT REPEAT', priority: 99, activeDefault: false, kind: 'negative_identity_example', blockedForGeneration: true, guidance: 'Bad output memory. Stored for review, never sent to generation.' }
  ];

  var ROLE_BY_ID = ROLE_DEFS.reduce(function(acc, role){ acc[role.id] = role; return acc; }, {});
  var LEGACY_TO_ROLE = ROLE_DEFS.reduce(function(acc, role){ if (role.legacyKey) acc[role.legacyKey] = role; return acc; }, {});

  function esc(value){
    if (typeof window.ESC === 'function') return window.ESC(value);
    return String(value == null ? '' : value).replace(/[&<>"']/g, function(ch){
      return ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[ch];
    });
  }

  function readAssetState(charId){
    try { return JSON.parse(localStorage.getItem('silva_assets_' + charId) || '{}') || {}; }
    catch (_) { return {}; }
  }

  function writeAssetState(charId, state){
    localStorage.setItem('silva_assets_' + charId, JSON.stringify(state || {}));
  }

  function canonicalFallback(charId){
    var refs = window.CANONICAL_REFS || {};
    var out = {
      aisha: { face: 'assets/aisha_face.png', body: 'assets/aisha_body.png' },
      leah: { face: refs.leah_face || '', body: refs.leah_body || '' },
      claudia: { face: refs.claudia_face || '', body: refs.claudia_body || '' },
      grok: { face: refs.grok_face || '', body: refs.grok_body || '' },
      vanya: { face: window.VANYA_FACE || '', body: window.VANYA_BODY || '' }
    };
    return out[charId] || {};
  }

  function extractSource(value){
    if (!value) return '';
    if (typeof value === 'string') {
      var trimmed = value.trim();
      if (!trimmed) return '';
      if (trimmed[0] === '{') {
        try { return extractSource(JSON.parse(trimmed)); } catch (_) {}
      }
      return trimmed;
    }
    if (typeof value === 'object') return extractSource(value.dataUrl || value.imageData || value.src || value.url || value.preview || value.previewUrl || value.path || '');
    return '';
  }

  function normalizeProviderSource(value){
    var raw = extractSource(value);
    if (!raw || /^vault:/i.test(raw)) return null;
    if (/^data:image\//i.test(raw)) return { dataUrl: raw, preview: raw };
    if (/^https?:\/\//i.test(raw)) return { url: raw, preview: raw };
    if (/^\/assets\//i.test(raw)) return { url: new URL(raw, window.location.origin).toString(), preview: raw };
    if (/^(?:\.?\/)?assets\//i.test(raw)) return { url: new URL(raw.replace(/^\.\//, ''), window.location.origin + '/').toString(), preview: raw };
    return null;
  }

  function fileQualityWarnings(roleId, meta){
    var warnings = [];
    var width = Number(meta && meta.width || 0);
    var height = Number(meta && meta.height || 0);
    var minSide = Math.min(width || 0, height || 0);
    if (width && height && minSide < 512) warnings.push('Low resolution; upload 800px+ if possible.');
    if ((roleId === 'primary_face' || roleId === 'profile_side') && width && height && width > height * 2) warnings.push('Very wide crop; a closer face/contact sheet will lock better.');
    if (roleId === 'primary_body' && width && height && height < width) warnings.push('Landscape body ref; full vertical body reads stronger.');
    return warnings;
  }

  function makeRefFromRole(charId, role, sourceValue, sourceLabel, stored){
    var normalized = normalizeProviderSource(sourceValue);
    if (!normalized) return null;
    stored = stored || {};
    var warnings = Array.isArray(stored.warnings) ? stored.warnings.slice() : fileQualityWarnings(role.id, stored);
    return {
      id: stored.id || ('legacy_' + role.id),
      characterId: charId,
      type: role.type,
      role: role.id === 'primary_face' ? 'primary_face' : role.id === 'primary_body' ? 'primary_body' : role.kind,
      identityRole: role.id,
      label: stored.label || role.payloadLabel,
      displayLabel: role.label,
      priority: Number(stored.priority || role.priority),
      source: stored.source || sourceLabel || 'assets_vault',
      activeDefault: stored.activeDefault != null ? Boolean(stored.activeDefault) : Boolean(role.activeDefault),
      blockedForGeneration: Boolean(role.blockedForGeneration || stored.blockedForGeneration),
      referenceKind: stored.referenceKind || role.kind,
      referencePackVersion: 'identity-pack-v3',
      qualityWarnings: warnings,
      width: stored.width || 0,
      height: stored.height || 0,
      dataUrl: normalized.dataUrl || '',
      url: normalized.url || '',
      preview: normalized.preview || normalized.dataUrl || normalized.url || ''
    };
  }

  function normalizeStoredPackRef(charId, item){
    if (!item) return null;
    var role = ROLE_BY_ID[item.identityRole || item.roleId || item.role] || ROLE_BY_ID[item.type] || ROLE_BY_ID.primary_face;
    return makeRefFromRole(charId, role, item.dataUrl || item.url || item.preview || item.src, item.source || 'identity_pack_upload', item);
  }

  function dedupeRefs(refs){
    var seen = Object.create(null);
    return refs.filter(function(ref){
      if (!ref) return false;
      var src = ref.dataUrl || ref.url || ref.preview || '';
      var key = [ref.identityRole || ref.role || ref.type, src.slice(0, 96)].join('::');
      if (seen[key]) return false;
      seen[key] = true;
      return true;
    }).sort(function(a, b){ return Number(a.priority || 99) - Number(b.priority || 99); });
  }

  function identityPackRefsForCharacter(charId, options){
    options = options || {};
    var st = readAssetState(charId);
    var fallback = canonicalFallback(charId);
    var refs = [];
    ROLE_DEFS.forEach(function(role){
      if (!role.legacyKey) return;
      var value = st[role.legacyKey] || fallback[role.legacyKey] || '';
      var ref = makeRefFromRole(charId, role, value, st[role.legacyKey] ? ('uploaded_' + role.legacyKey) : ('canonical_' + role.legacyKey), {
        id: 'legacy_' + role.legacyKey,
        warnings: st[role.legacyKey + 'Warnings'] || []
      });
      if (ref) refs.push(ref);
    });
    var pack = st.identityPack && Array.isArray(st.identityPack.refs) ? st.identityPack.refs : [];
    pack.forEach(function(item){
      var ref = normalizeStoredPackRef(charId, item);
      if (ref) refs.push(ref);
    });
    refs = dedupeRefs(refs);
    if (!options.includeRejected) refs = refs.filter(function(ref){ return !ref.blockedForGeneration; });
    return refs;
  }

  function generationRefsForCharacter(charId){
    var refs = identityPackRefsForCharacter(charId);
    var primaryFace = refs.find(function(ref){ return ref.identityRole === 'primary_face'; });
    var primaryBody = refs.find(function(ref){ return ref.identityRole === 'primary_body'; });
    var support = refs.filter(function(ref){
      return ['profile_side','expression_closeups','hair_texture'].indexOf(ref.identityRole) >= 0;
    }).slice(0, 4);
    var wardrobe = refs.filter(function(ref){ return ref.identityRole === 'wardrobe'; }).slice(0, 2);
    var approved = refs.filter(function(ref){ return ref.identityRole === 'approved_gold'; }).slice(0, 1);
    return [primaryFace, primaryBody].filter(Boolean).concat(support, wardrobe, approved).filter(Boolean);
  }

  function ensurePackState(st){
    st.identityPack = st.identityPack && typeof st.identityPack === 'object' ? st.identityPack : {};
    st.identityPack.version = 'identity-pack-v3';
    st.identityPack.refs = Array.isArray(st.identityPack.refs) ? st.identityPack.refs : [];
    return st.identityPack;
  }

  function saveStoredRef(charId, roleId, dataUrl, fileName, meta){
    var role = ROLE_BY_ID[roleId] || ROLE_BY_ID.primary_face;
    var st = readAssetState(charId);
    var pack = ensurePackState(st);
    var item = {
      id: 'idref_' + role.id + '_' + Date.now(),
      identityRole: role.id,
      role: role.id,
      type: role.type,
      label: role.payloadLabel,
      source: 'identity_pack_upload',
      priority: role.priority,
      activeDefault: role.activeDefault,
      blockedForGeneration: Boolean(role.blockedForGeneration),
      fileName: fileName || '',
      dataUrl: dataUrl,
      width: meta.width || 0,
      height: meta.height || 0,
      warnings: fileQualityWarnings(role.id, meta),
      createdAt: new Date().toISOString()
    };
    if (role.legacyKey) {
      st[role.legacyKey] = dataUrl;
      st[role.legacyKey + 'Warnings'] = item.warnings;
    }
    if (role.id !== 'expression_closeups' && role.id !== 'rejected_do_not_repeat') {
      pack.refs = pack.refs.filter(function(ref){ return (ref.identityRole || ref.role) !== role.id; });
    }
    pack.refs.unshift(item);
    pack.updatedAt = item.createdAt;
    writeAssetState(charId, st);
    if (typeof window.toast === 'function') window.toast(role.label + ' saved for ' + charId);
    if (typeof window.renderAssets === 'function') window.renderAssets();
    try { window.PromptGeneratorV3 && window.PromptGeneratorV3.renderReferenceDock && window.PromptGeneratorV3.renderReferenceDock(); } catch (_) {}
  }

  function loadImageMeta(dataUrl){
    return new Promise(function(resolve){
      var img = new Image();
      img.onload = function(){ resolve({ width: img.naturalWidth || 0, height: img.naturalHeight || 0 }); };
      img.onerror = function(){ resolve({ width: 0, height: 0 }); };
      img.src = dataUrl;
    });
  }

  function saveFileAsIdentityRef(charId, roleId, file){
    if (!file) return;
    if (!/image\/(jpeg|png|webp)/i.test(file.type || '')) {
      if (typeof window.toast === 'function') window.toast('Use jpg, png, or webp for identity refs.');
      return;
    }
    var reader = new FileReader();
    reader.onload = function(ev){
      var dataUrl = ev.target && ev.target.result;
      loadImageMeta(dataUrl).then(function(meta){ saveStoredRef(charId, roleId, dataUrl, file.name, meta); });
    };
    reader.readAsDataURL(file);
  }

  function roleOptionsHtml(selected){
    return ROLE_DEFS.map(function(role){
      return '<option value="' + esc(role.id) + '"' + (role.id === selected ? ' selected' : '') + '>' + esc(role.label) + '</option>';
    }).join('');
  }

  function refThumbHtml(charId, role, ref){
    var img = ref && (ref.preview || ref.dataUrl || ref.url);
    var warnings = ref && Array.isArray(ref.qualityWarnings) ? ref.qualityWarnings : [];
    return [
      '<div class="identity-vault-slot ' + (img ? 'has-img' : '') + '" data-role="' + esc(role.id) + '" ondragover="event.preventDefault()" ondrop="window.handleIdentityPackDrop(event,\'' + esc(charId) + '\',\'' + esc(role.id) + '\')" onclick="window.uploadIdentityPackRef(\'' + esc(charId) + '\',\'' + esc(role.id) + '\')">',
        '<div class="identity-vault-slot-head"><strong>' + esc(role.label) + '</strong><span>' + esc(ref && !ref.blockedForGeneration ? (ref.activeDefault ? 'active' : 'support') : role.blockedForGeneration ? 'never sent' : 'needed') + '</span></div>',
        img ? '<img src="' + esc(img) + '" alt="' + esc(role.label) + '">' : '<div class="identity-vault-empty">Drop image or click to upload</div>',
        '<p>' + esc(role.guidance) + '</p>',
        warnings.length ? '<div class="identity-vault-warnings">' + warnings.map(function(w){ return '<span>' + esc(w) + '</span>'; }).join('') + '</div>' : '',
        ref ? '<div class="identity-vault-actions" onclick="event.stopPropagation()"><select onchange="window.updateIdentityPackRefRole(\'' + esc(charId) + '\',\'' + esc(ref.id) + '\',this.value)">' + roleOptionsHtml(ref.identityRole || role.id) + '</select><button type="button" onclick="window.uploadIdentityPackRef(\'' + esc(charId) + '\',\'' + esc(role.id) + '\')">Replace</button><button type="button" onclick="window.removeIdentityPackRef(\'' + esc(charId) + '\',\'' + esc(ref.id) + '\')">Remove</button></div>' : '',
      '</div>'
    ].join('');
  }

  function identityVaultRecommendations(refs){
    var roles = refs.reduce(function(acc, ref){ acc[ref.identityRole] = true; return acc; }, {});
    var recs = [];
    if (!roles.primary_face) recs.push('Add Primary Face before generating.');
    if (!roles.primary_body) recs.push('Add Primary Body/Build before generating.');
    if (!roles.profile_side) recs.push('Add Profile/Side to reduce angle drift.');
    if (!roles.expression_closeups) recs.push('Add Expression Closeups for eyes and mouth consistency.');
    if (!roles.hair_texture) recs.push('Add Hair/Texture for hair, glasses, and skin detail.');
    return recs;
  }

  function sentPreviewHtml(refs){
    var send = refs.filter(function(ref){ return !ref.blockedForGeneration; }).slice(0, 8);
    if (!send.length) return '<div class="identity-vault-sent-empty">No refs ready for generation.</div>';
    return '<ol>' + send.map(function(ref, index){
      return '<li><span>' + String(index + 1).padStart(2, '0') + '</span><strong>' + esc(ref.displayLabel || ref.label || ref.type) + '</strong><em>' + esc(ref.qualityWarnings && ref.qualityWarnings.length ? ref.qualityWarnings[0] : 'ready') + '</em></li>';
    }).join('') + '</ol>';
  }

  function renderAssetsRescue(){
    var grid = document.getElementById('assets-grid');
    if (!grid) return;
    var chars = ['aisha','leah','claudia','grok','vanya'];
    grid.innerHTML = chars.map(function(charId){
      var c = typeof window.getChar === 'function' ? (window.getChar(charId) || {}) : {};
      var st = readAssetState(charId);
      var refs = identityPackRefsForCharacter(charId, { includeRejected: true });
      var genRefs = generationRefsForCharacter(charId);
      var roles = refs.reduce(function(acc, ref){ if (!acc[ref.identityRole]) acc[ref.identityRole] = ref; return acc; }, {});
      var recs = identityVaultRecommendations(refs);
      var ready = Boolean(roles.primary_face && roles.primary_body);
      return [
        '<article class="asset-card identity-vault-card" id="identity-vault-' + esc(charId) + '">',
          '<div class="asset-card-head identity-vault-card-head">',
            '<div><div class="asset-title">' + esc(c.name || charId) + '</div><div class="asset-sub">' + esc(c.role || '') + '</div></div>',
            '<span class="identity-vault-status ' + (ready ? 'ready' : 'blocked') + '">' + (ready ? 'identity ready' : 'needs refs') + '</span>',
          '</div>',
          '<div class="asset-body identity-vault-body">',
            '<div class="identity-vault-brief"><strong>Identity Pack Builder</strong><span>Primary face and body are sent first. Support refs are controlled. Rejected refs are never sent.</span></div>',
            recs.length ? '<div class="identity-vault-recs"><span>Improve next</span>' + recs.slice(0, 3).map(function(rec){ return '<b>' + esc(rec) + '</b>'; }).join('') + '</div>' : '<div class="identity-vault-recs ready"><span>Ready</span><b>Face/body lock is ready. Add support refs only when they are clean and useful.</b></div>',
            '<div class="identity-vault-roles">' + ROLE_DEFS.map(function(role){ return refThumbHtml(charId, role, roles[role.id]); }).join('') + '</div>',
            '<div class="identity-vault-sent"><div><span>Sent to generation</span><strong>' + esc(genRefs.length + ' controlled refs') + '</strong></div>' + sentPreviewHtml(genRefs) + '</div>',
            '<label class="identity-vault-notes"><span>Identity Lock Notes</span><textarea id="note-' + esc(charId) + '" placeholder="Face, skin, hair, body, drift notes, what must never change.">' + esc(st.notes || st.identityPack && st.identityPack.notes || '') + '</textarea></label>',
            '<div class="identity-vault-footer"><button class="btn btn-ghost btn-sm" type="button" onclick="window.saveAssetNotes(\'' + esc(charId) + '\')">Save Notes</button><button class="btn btn-ghost btn-sm" type="button" onclick="window.nav&&window.nav(\'' + esc(charId) + '\')">View Character</button></div>',
          '</div>',
        '</article>'
      ].join('');
    }).join('');
  }

  window.uploadIdentityPackRef = function(charId, roleId){
    var input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/jpeg,image/png,image/webp';
    input.onchange = function(ev){ saveFileAsIdentityRef(charId, roleId, ev.target.files && ev.target.files[0]); };
    input.click();
  };

  window.handleIdentityPackDrop = function(ev, charId, roleId){
    ev.preventDefault();
    ev.stopPropagation();
    saveFileAsIdentityRef(charId, roleId, ev.dataTransfer && ev.dataTransfer.files && ev.dataTransfer.files[0]);
  };

  window.removeIdentityPackRef = function(charId, refId){
    var st = readAssetState(charId);
    var pack = ensurePackState(st);
    var legacyRole = ROLE_DEFS.find(function(role){ return refId === 'legacy_' + role.legacyKey; });
    if (legacyRole && legacyRole.legacyKey) {
      delete st[legacyRole.legacyKey];
      delete st[legacyRole.legacyKey + 'Warnings'];
    }
    pack.refs = pack.refs.filter(function(ref){ return ref.id !== refId; });
    pack.updatedAt = new Date().toISOString();
    writeAssetState(charId, st);
    renderAssetsRescue();
  };

  window.updateIdentityPackRefRole = function(charId, refId, nextRoleId){
    var st = readAssetState(charId);
    var pack = ensurePackState(st);
    var current = identityPackRefsForCharacter(charId, { includeRejected: true }).find(function(ref){ return ref.id === refId; });
    var nextRole = ROLE_BY_ID[nextRoleId] || ROLE_BY_ID.primary_face;
    if (!current) return;
    if (refId.indexOf('legacy_') === 0) {
      var legacy = ROLE_DEFS.find(function(role){ return refId === 'legacy_' + role.legacyKey; });
      if (legacy && legacy.legacyKey) delete st[legacy.legacyKey];
    } else {
      pack.refs = pack.refs.filter(function(ref){ return ref.id !== refId; });
    }
    pack.refs.unshift({
      id: 'idref_' + nextRole.id + '_' + Date.now(),
      identityRole: nextRole.id,
      role: nextRole.id,
      type: nextRole.type,
      label: nextRole.payloadLabel,
      source: current.source || 'identity_pack_upload',
      priority: nextRole.priority,
      activeDefault: nextRole.activeDefault,
      blockedForGeneration: Boolean(nextRole.blockedForGeneration),
      dataUrl: current.dataUrl || '',
      url: current.url || '',
      preview: current.preview || '',
      width: current.width || 0,
      height: current.height || 0,
      warnings: fileQualityWarnings(nextRole.id, current),
      createdAt: new Date().toISOString()
    });
    if (nextRole.legacyKey) st[nextRole.legacyKey] = current.dataUrl || current.url || current.preview || '';
    pack.updatedAt = new Date().toISOString();
    writeAssetState(charId, st);
    renderAssetsRescue();
  };

  window.uploadAsset = function(charId, type){
    var map = { face: 'primary_face', body: 'primary_body', profile: 'profile_side', side: 'profile_side', outfit: 'wardrobe', wardrobe: 'wardrobe', gold: 'approved_gold', rejected: 'rejected_do_not_repeat' };
    window.uploadIdentityPackRef(charId, map[type] || type || 'primary_face');
  };

  window.saveAssetNotes = function(charId){
    var notes = document.getElementById('note-' + charId)?.value || '';
    var st = readAssetState(charId);
    var pack = ensurePackState(st);
    st.notes = notes;
    pack.notes = notes;
    pack.updatedAt = new Date().toISOString();
    writeAssetState(charId, st);
    if (typeof window.toast === 'function') window.toast('Identity notes saved for ' + ((window.getChar && window.getChar(charId)?.name) || charId));
  };

  window.identityPackRefsForCharacter = identityPackRefsForCharacter;
  window.getCharacterVaultRefs = function(charId){
    return generationRefsForCharacter(charId || 'leah');
  };
  window.renderAssets = renderAssetsRescue;

  function installAssetsVaultNavRescue(){
    if (typeof window.nav === 'function' && !window.nav.__identityVaultRescue) {
      var previousNav = window.nav;
      window.nav = function(page){
        var result = previousNav.apply(this, arguments);
        if (page === 'assets') setTimeout(renderAssetsRescue, 0);
        return result;
      };
      window.nav.__identityVaultRescue = true;
    }
  }

  document.addEventListener('click', function(ev){
    var target = ev.target && ev.target.closest && ev.target.closest('.nav-item[data-page="assets"]');
    if (target) setTimeout(renderAssetsRescue, 80);
  }, true);

  window.openIdentityPackForCurrentCharacter = function(charId){
    var id = charId || window._lastImageRouteResult?.character || document.getElementById('g-char')?.value || 'leah';
    if (typeof window.nav === 'function') window.nav('assets');
    else window.location.hash = '#assets';
    setTimeout(function(){
      try {
        renderAssetsRescue();
        var card = document.getElementById('identity-vault-' + id);
        if (card) {
          card.classList.add('identity-vault-focus');
          card.scrollIntoView({ block: 'center', behavior: 'smooth' });
        }
      } catch (_) {}
    }, 80);
  };

  if (document.readyState !== 'loading') {
    installAssetsVaultNavRescue();
    setTimeout(installAssetsVaultNavRescue, 150);
    setTimeout(installAssetsVaultNavRescue, 500);
    if (document.getElementById('page-assets')?.classList.contains('active')) renderAssetsRescue();
  } else {
    document.addEventListener('DOMContentLoaded', function(){
      installAssetsVaultNavRescue();
      setTimeout(installAssetsVaultNavRescue, 150);
      setTimeout(installAssetsVaultNavRescue, 500);
      if (document.getElementById('page-assets')?.classList.contains('active')) renderAssetsRescue();
    });
  }
  window.addEventListener('load', function(){
    setTimeout(function(){
      installAssetsVaultNavRescue();
      if (document.getElementById('page-assets')?.classList.contains('active')) renderAssetsRescue();
    }, 180);
  });
})();
