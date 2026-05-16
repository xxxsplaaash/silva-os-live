(function(){
  if (window.SilvaSurfaceOwners) return;

  var registry = Object.create(null);

  function normalize(surface){
    return String(surface || '').trim().replace(/^#/, '').toLowerCase();
  }

  function claim(surface, owner, meta){
    var key = normalize(surface);
    if (!key) return null;
    var entry = {
      surface: key,
      owner: String(owner || 'unknown'),
      claimedAt: new Date().toISOString(),
      meta: meta && typeof meta === 'object' ? Object.assign({}, meta) : {}
    };
    registry[key] = entry;
    try {
      document.documentElement.setAttribute('data-silva-owner-' + key, entry.owner);
      window.dispatchEvent(new CustomEvent('silva:surface-owner', { detail: entry }));
    } catch (_) {}
    return entry;
  }

  function get(surface){
    return registry[normalize(surface)] || null;
  }

  function isOwnedBy(surface, owner){
    var entry = get(surface);
    return Boolean(entry && entry.owner === String(owner || ''));
  }

  function snapshot(){
    return Object.keys(registry).reduce(function(out, key){
      out[key] = Object.assign({}, registry[key]);
      return out;
    }, {});
  }

  window.SilvaSurfaceOwners = {
    claim: claim,
    get: get,
    isOwnedBy: isOwnedBy,
    snapshot: snapshot
  };
})();
