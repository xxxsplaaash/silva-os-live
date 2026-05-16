function validateLivingRoomResponse(response = {}, turnPlan = {}) {
  const events = Array.isArray(response?.messageEvents) ? response.messageEvents.filter(Boolean) : [];
  const errors = [];
  if (!events.length) errors.push('No message events were produced.');
  if (turnPlan.targetSpeakerId && !events.some(item => String(item?.speakerId || '').trim().toLowerCase() === turnPlan.targetSpeakerId)) {
    errors.push('Direct target speaker is missing from the visible response.');
  }
  return {
    ok: errors.length === 0,
    errors
  };
}

module.exports = {
  validateLivingRoomResponse
};
