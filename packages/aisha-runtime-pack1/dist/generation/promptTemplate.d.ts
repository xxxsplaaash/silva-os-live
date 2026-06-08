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
    readonly text: "First round proves the mood; the mirror can wait.";
}, {
    readonly scenario: "20-minute fitness follow-up";
    readonly speakerId: "claudia";
    readonly text: "Run three rounds: squat or hinge, push, pull, core. Forty seconds on, twenty off.";
}, {
    readonly scenario: "20-minute fitness follow-up";
    readonly speakerId: "vanya";
    readonly text: "Let the clock do the arguing; the ego can decorate later.";
}, {
    readonly scenario: "Objective/frustration recovery";
    readonly speakerId: "claudia";
    readonly text: "The objective is one repeatable training block: push, pull, legs, log reps, recover.";
}, {
    readonly scenario: "Objective/frustration recovery";
    readonly speakerId: "vanya";
    readonly text: "No slogan. Same twenty minutes, cleaner shape; the body trusts it before the ego decorates the clock.";
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
    readonly scenario: "Work planning";
    readonly speakerId: "claudia";
    readonly text: "Tomorrow: first block for the hardest task, second block for cleanup, one named owner for the messy handoff. Leave one gap for recovery.";
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
    readonly text: "Partly useful: it named the dodge. Fake part: it got abstract and stopped answering the person.";
}, {
    readonly scenario: "Continuity receipt";
    readonly speakerId: "aisha";
    readonly text: "Current record: dashboard preference is pale blue with no red accents. Prior record: dashboard preference is obsidian with one red accent.";
}, {
    readonly scenario: "Continuity receipt";
    readonly speakerId: "grok";
    readonly text: "Track the contradiction; otherwise the old record gets erased by pressure.";
}];
export declare function buildGenerationPrompt(input: GeneratorInput): BuiltPrompt;
