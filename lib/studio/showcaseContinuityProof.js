function safeStatus(value = '') {
  const status = String(value || '').trim().toLowerCase();
  return ['active', 'superseded', 'disputed'].includes(status) ? status : 'active';
}

function safeSource(value = '') {
  return String(value || '').trim().toLowerCase() === 'pack1-memory'
    ? 'pack1-memory'
    : 'showcase-session';
}

function continuityProofFromLedger(continuityLedger = []) {
  const rows = Array.isArray(continuityLedger) ? continuityLedger : [];
  const proof = rows.reduce((acc, row) => {
    const source = safeSource(row?.source);
    const status = safeStatus(row?.status);
    acc.total += 1;
    acc[status] += 1;
    if (source === 'pack1-memory') {
      acc.pack1Rows += 1;
      acc.pack1[status] += 1;
    }
    return acc;
  }, {
    active: 0,
    superseded: 0,
    disputed: 0,
    total: 0,
    pack1Rows: 0,
    pack1: { active: 0, superseded: 0, disputed: 0 }
  });

  return {
    active: proof.pack1Rows > 0,
    contradictionReady: proof.pack1.active > 0 && (proof.pack1.superseded > 0 || proof.pack1.disputed > 0),
    activeTruths: proof.pack1.active,
    supersededTruths: proof.pack1.superseded,
    disputedTruths: proof.pack1.disputed,
    totalRows: proof.total,
    pack1Rows: proof.pack1Rows,
    source: proof.pack1Rows > 0 ? 'pack1-memory' : 'none'
  };
}

function emptyContinuityProof() {
  return continuityProofFromLedger([]);
}

module.exports = {
  continuityProofFromLedger,
  emptyContinuityProof
};
