function planSpark(runtime = {}, options = {}) {
  if (options.manual === true) {
    return {
      shouldSurface: true,
      speakerId: runtime?.lastActiveSpeaker || 'aisha',
      reason: 'manual-spark',
      quietAllowed: true
    };
  }
  const tension = Number(runtime?.roomTension || 0);
  if (tension >= 0.7) {
    return {
      shouldSurface: true,
      speakerId: runtime?.lastActiveSpeaker || 'aisha',
      reason: 'tension-threshold',
      quietAllowed: false
    };
  }
  return {
    shouldSurface: false,
    speakerId: '',
    reason: 'quiet-room',
    quietAllowed: true
  };
}

module.exports = {
  planSpark
};
