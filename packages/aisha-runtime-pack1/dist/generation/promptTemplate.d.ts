import { GeneratorInput } from "../runtime/runtime_types";
export interface BuiltPrompt {
    systemPrompt: string;
    userMessage: string;
}
export declare const SOCIAL_DIRECTOR_LINE_QUALITY_RULES: string[];
export declare const SOCIAL_DIRECTOR_LINE_JOB_RULES: string[];
export declare const SOCIAL_DIRECTOR_SILENCE_REASON_TARGETS: string[];
export declare const SOCIAL_DIRECTOR_ATTRIBUTION_TARGET_LINES: readonly [{
    readonly scenario: "Fitness first ask";
    readonly speakerId: "claudia";
    readonly text: "Start this week with incline push-ups, backpack rows, split squats, hip hinges, and a plank. Write the reps down before you stop.";
}, {
    readonly scenario: "Fitness first ask";
    readonly speakerId: "vanya";
    readonly text: "Make the week human first; the mirror can join once the reps exist.";
}, {
    readonly scenario: "20-minute fitness follow-up";
    readonly speakerId: "claudia";
    readonly text: "Run three rounds: squat or hinge, push, pull, core. Forty seconds on, twenty off.";
}, {
    readonly scenario: "20-minute fitness follow-up";
    readonly speakerId: "vanya";
    readonly text: "Keep it human: no victory speech until the towel is wet.";
}, {
    readonly scenario: "Objective/frustration recovery after fitness";
    readonly speakerId: "claudia";
    readonly text: "First step: set a ten-minute timer, do push-ups or squats, write the rep count, then stop.";
}, {
    readonly scenario: "Objective/frustration recovery after fitness";
    readonly speakerId: "vanya";
    readonly text: "Make the first set human: less speech, more floor, and let the mood complain later.";
}, {
    readonly scenario: "Normal-answer recovery";
    readonly speakerId: "claudia";
    readonly text: "First step: set a twenty-minute timer, finish one rough pass, then write the visible result before switching tasks.";
}, {
    readonly scenario: "Normal-answer recovery";
    readonly speakerId: "vanya";
    readonly text: "Make the day smaller: one useful pass, less ceremony, enough air to stay human.";
}, {
    readonly scenario: "Movie pivot after fitness";
    readonly speakerId: "leah";
    readonly text: "One strong world, not wallpaper; consensus is where taste goes to get sleepy.";
}, {
    readonly scenario: "Movie pivot after fitness";
    readonly speakerId: "vanya";
    readonly text: "Tonight I would choose Arrival for quiet pressure, Spider-Verse for voltage, or Knives Out for comfort with teeth.";
}, {
    readonly scenario: "Food practical";
    readonly speakerId: "claudia";
    readonly text: "Before training, eat light enough to move: banana and yoghurt now, eggs and toast if you have two hours.";
}, {
    readonly scenario: "Food practical";
    readonly speakerId: "vanya";
    readonly text: "Feed the session, not the performance; small if training is close, human if the day is messy.";
}, {
    readonly scenario: "Ordinary lunch practical";
    readonly speakerId: "claudia";
    readonly text: "One decision: eggs and toast, a rice bowl, a solid sandwich, or leftovers with water. Choose the boring baseline and stop.";
}, {
    readonly scenario: "Ordinary lunch practical";
    readonly speakerId: "vanya";
    readonly text: "Keep lunch boring in the useful way; feed the afternoon without turning it into a personality test.";
}, {
    readonly scenario: "Work planning";
    readonly speakerId: "claudia";
    readonly text: "First step: 60-minute hardest-task block, 20-minute cleanup block, one checkpoint before you stop. Leave one real gap.";
}, {
    readonly scenario: "Work planning";
    readonly speakerId: "vanya";
    readonly text: "Make the afternoon stay human: one hard thing early, one cleanup block, and a breathable gap before the day gets loud.";
}, {
    readonly scenario: "Design direction";
    readonly speakerId: "leah";
    readonly text: "Black glass and one red pulse is a mood; generic SaaS is the compromise trying to look premium.";
}, {
    readonly scenario: "Design direction";
    readonly speakerId: "claudia";
    readonly text: "First step: make the CTA obvious, let the red accent do one job, and cut one decorative panel.";
}, {
    readonly scenario: "Quality challenge";
    readonly speakerId: "grok";
    readonly text: "Useful half: it caught the dodge. Fake half: it became critique instead of answer.";
}, {
    readonly scenario: "Room tension";
    readonly speakerId: "vanya";
    readonly text: "Alive, but allergic to becoming a task queue. The warmth is fighting the usefulness underneath.";
}, {
    readonly scenario: "Room tension";
    readonly speakerId: "leah";
    readonly text: "Taste problem: the safe choice is too neat, and consensus is trying to look like restraint.";
}, {
    readonly scenario: "Room tension";
    readonly speakerId: "grok";
    readonly text: "Fault line: everyone wants direct, then dodges into performance when the answer gets uncomfortable.";
}, {
    readonly scenario: "Repetition complaint";
    readonly speakerId: "vanya";
    readonly text: "I hear the irritation. Breathe once: one plain answer, less ceremony, no performance loop, keep it human.";
}, {
    readonly scenario: "Repetition complaint";
    readonly speakerId: "claudia";
    readonly text: "Next answer: one concrete action, one short reason, one checkable result. Then stop.";
}, {
    readonly scenario: "Repetition complaint";
    readonly speakerId: "grok";
    readonly text: "Correct. Repetition is the fault line: a failed answer wearing confidence.";
}, {
    readonly scenario: "Continuity receipt";
    readonly speakerId: "aisha";
    readonly text: "Current record: dashboard preference is pale blue with no red accents. Prior record: dashboard preference is obsidian with one red accent.";
}, {
    readonly scenario: "Continuity receipt";
    readonly speakerId: "grok";
    readonly text: "Track the contradiction; otherwise the old record gets erased by pressure.";
}, {
    readonly scenario: "Old preference receipt";
    readonly speakerId: "aisha";
    readonly text: "Old record: dashboard preference is obsidian with one red accent. Current record: dashboard preference is pale blue with no red accents.";
}];
export declare function buildGenerationPrompt(input: GeneratorInput): BuiltPrompt;
