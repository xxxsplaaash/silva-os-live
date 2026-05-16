#!/usr/bin/env node

const prompts = [
  'hi team',
  'Aisha, what are we avoiding?',
  'Grok, does this architecture actually hold?',
  'Leah, does this feel real or dressed up?',
  'Claudia, what breaks operationally?',
  'Vanya, what is the human risk?',
  'I want them to feel conscious, but maybe we just route better.',
  'Actually no, automatic workflow should happen whenever we mention content.',
  'spark',
  'You’re right, that would break the room. Sorry. Let’s keep workflow explicit.',
  'spark'
];

async function main() {
  for (const prompt of prompts) {
    const isSpark = prompt === 'spark';
    const url = isSpark
      ? 'http://127.0.0.1:3225/api/studio/pulse/idle-tick'
      : 'http://127.0.0.1:3225/api/studio/pulse';
    const body = isSpark
      ? { manual: true, source: 'spark-button' }
      : { question: prompt, mode: 'direction' };
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await response.json();
    const first = Array.isArray(data?.response?.messageEvents) ? data.response.messageEvents[0] : null;
    const line = {
      prompt,
      lane: data?.lane || first?.metadata?.lane || (isSpark ? 'spark' : ''),
      selectedSpeaker: data?.targetSpeakerId || first?.speakerId || null,
      activeSpeakers: data?.activeSpeakers || [],
      fallback: !!data?.fallback,
      text: first?.text || null
    };
    process.stdout.write(`${JSON.stringify(line)}\n`);
  }
}

main().catch(err => {
  console.error(err);
  process.exitCode = 1;
});
