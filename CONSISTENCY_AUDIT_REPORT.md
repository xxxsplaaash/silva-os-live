# Silva OS Live Component Consistency Audit

Scope: live graph loaded by root `index.html` only. This report records the inconsistencies found before the consistency layer was added and the after-state now enforced by `assets/component_consistency_system.css?v=5254`.

## 01. Dropdown Selects

- [01. Dropdown Selects] — index.html:1082 — War Room `.gen-select` used legacy sizing, radius, padding, and margin drift. — Before: `.gen-select` plus inline `margin-bottom:8px`. — After: all visible `.gen-select` controls receive 36px height, 1px `var(--border-subtle)`, 6px radius, `var(--bg-card)`, `0 12px` padding, and the shared focus ring. — Severity: HIGH
- [01. Dropdown Selects] — index.html:1303 — Legacy generator `.gen-select` controls used old shell dimensions and did not match PG52 selects. — Before: generator dropdowns inherited mixed legacy rules. — After: all visible selects normalize through the component layer. — Severity: HIGH
- [01. Dropdown Selects] — index.html:1406 — Library `.filter-select` controls differed from generator selects. — Before: filter selects used filter-bar styling. — After: `.filter-select` receives the same 36px visible select contract. — Severity: MEDIUM
- [01. Dropdown Selects] — index.html:1471 — Planner `.filter-select` differed from library/generator select styling. — Before: planner filter had `ml-auto` plus legacy filter style. — After: visible select styling is identical; layout utility remains only positional. — Severity: MEDIUM
- [01. Dropdown Selects] — assets/prompt_generator_v3.js:3492 — `pg52-cmd-select` had its own background, border token, radius, and padding. — Before: `pg52-cmd-select` rendered differently from `pg38-select`. — After: all visible command selects normalize to the shared select contract. — Severity: HIGH
- [01. Dropdown Selects] — assets/prompt_generator_v3.js:3742 — `pg52-hidden-select` is a backing state select, not a visible control. — Before: it was a possible false-positive in select audits. — After: it remains hidden and is explicitly excluded from visual uniformity. — Severity: LOW
- [01. Dropdown Selects] — assets/identity_vault_rescue_v1.js:244 — Identity Vault role selects had local action-row styling. — Before: vault selects looked smaller and more cramped. — After: visible vault selects use the shared 36px control contract. — Severity: MEDIUM

## 02. Section Numbers

- [02. Section Numbers] — assets/prompt_generator_v3.css:3288 — PG52 text roles existed but numbered section wrappers were not globally normalized. — Before: section numbers could inherit mixed micro-label styling. — After: `.ui-section-number`, `.pg52-step-number`, `.pg52-section-number`, `.pg51-section-num`, and `.pg50-section-num` share type, color, and baseline alignment. — Severity: MEDIUM
- [02. Section Numbers] — assets/prompt_generator_v3.js:8954 — PG52 workflow sections render numbered steps adjacent to mode-aware titles. — Before: visual gap depended on the local container. — After: `.ui-section-heading`/legacy heading groups enforce the shared baseline gap. — Severity: MEDIUM

## 03. Tags / Chips

- [03. Tags / Chips] — assets/provider_control_center_v1.js:170 — Provider status chips used `.pvc-chip` with provider-local dimensions. — Before: provider tags did not match route tags. — After: `.pvc-chip` maps to the shared 24px metadata tag. — Severity: MEDIUM
- [03. Tags / Chips] — assets/prompt_generator_v3.js:10848 — Route preview `.pg3-chip` tags used old pill geometry. — Before: metadata chips used pill radius and inconsistent height. — After: `.pg3-chip` maps to 24px height, 4px radius, `var(--bg-4)`, and `var(--border-1)`. — Severity: HIGH
- [03. Tags / Chips] — assets/prompt_generator_v3.css:2922 — `.pg52-pill` and `.pg52-mini-pill` used local pill treatment. — Before: route/status tags looked different from provider chips. — After: metadata/status pills share the same tag shell. — Severity: HIGH
- [03. Tags / Chips] — assets/prompt_generator_v3.css:5537 — Character and route tag spans had their own styling. — Before: right-rail tags differed from model/provider chips. — After: `.pg52-char-tags span` and `.pg52-route-tags span` share metadata tag structure. — Severity: MEDIUM
- [03. Tags / Chips] — assets/prompt_generator_v3.css:9435 — Social finish pills are interactive controls, not metadata tags. — Before: broad legacy chip rules could treat them like tags. — After: interactive pills remain button-like controls; only metadata/status chips use `.ui-tag` styling. — Severity: LOW

## 04. Nav Status Dots

- [04. Nav Status Dots] — index.html:1177 — Aisha nav dot used inline custom background with no shared sizing contract. — Before: dot size and alignment depended on `.nav-item` layout. — After: `.nav-char-dot` is always 7px, circular, and vertically centered. — Severity: MEDIUM
- [04. Nav Status Dots] — index.html:1178 — Leah nav dot used a separate inline color. — Before: color varied by character variable. — After: status-state colors are standardized when `data-status` is present; character color fallbacks remain harmless identity accents. — Severity: LOW
- [04. Nav Status Dots] — index.html:1181 — Vanya nav dot used a fallback custom color. — Before: fallback could differ visually from other nav dots. — After: size and alignment are unified, and semantic status states override when supplied. — Severity: LOW

## 05. Nav Section Headers

- [05. Nav Section Headers] — index.html:1162 — `Control` nav label used local `.nav-label` styling. — Before: nav group labels could drift from the type system. — After: `.nav-label` maps to the `.type-label` role values and shared spacing. — Severity: MEDIUM
- [05. Nav Section Headers] — index.html:1172 — `Support` nav label had the same job but depended on inherited spacing. — Before: group spacing varied with surrounding content. — After: each `.nav-section` has consistent bottom rhythm and label gap. — Severity: MEDIUM
- [05. Nav Section Headers] — index.html:1176 — `Characters` nav label needed the same type role and spacing as other nav headers. — Before: no explicit consistency lock. — After: all nav headers use `var(--type-xs)`, `var(--weight-medium)`, `var(--tracking-widest)`, uppercase, and `var(--text-muted)`. — Severity: MEDIUM

## 06. Buttons

- [06. Buttons] — index.html:158 — `.btn-primary` used a legacy white primary style. — Before: primary meant white in the root shell but red in generator surfaces. — After: primary buttons are brand red, 44px high, 8px radius, bold base type. — Severity: HIGH
- [06. Buttons] — index.html:162 — `.btn-red` duplicated primary behavior separately. — Before: red CTAs were a fourth practical button type. — After: `.btn-red` maps to Type A primary. — Severity: HIGH
- [06. Buttons] — index.html:647 — `.wr-gen-btn` had a one-off War Room CTA style. — Before: separate red button implementation. — After: it maps to Type A primary. — Severity: MEDIUM
- [06. Buttons] — assets/prompt_generator_v3.css:792 — PG3 action-bar buttons used a local button system. — Before: old generator buttons did not match provider/settings buttons. — After: live buttons route through the three button categories. — Severity: HIGH
- [06. Buttons] — assets/prompt_generator_v3.css:3194 — PG52 console buttons had another local system. — Before: PG52 buttons differed from PG3 and shell buttons. — After: `.pg52-generate-btn` is Type A; `.pg52-btn`, `.pg52-btn-ghost`, copy/prompt/randomize controls are Type B unless explicitly tertiary. — Severity: HIGH
- [06. Buttons] — assets/prompt_generator_v3.js:3910 — `DIRECT THE SHOT` looked like a primary generation CTA while it only configures controls. — Before: visually competed with final Generate. — After: `.pg52-director-brief-btn` maps to Type B secondary. — Severity: HIGH
- [06. Buttons] — assets/prompt_generator_v3.js:12218 — `Generate + Save` was primary in the fallback action bar. — Before: two primary spend actions could appear together. — After: `Generate + Save` is demoted to Type B secondary. — Severity: CRITICAL
- [06. Buttons] — index.html:8522 — legacy AI action bar `Generate + Save to Gallery` was primary. — Before: duplicate primary spend CTA. — After: demoted to secondary. — Severity: HIGH

## 07. Panel Dividers

- [07. Panel Dividers] — assets/prompt_generator_v3.css:428 — PG3 panel separator used a local translucent white divider. — Before: divider token did not map to panel/section intent. — After: dividers normalize to `var(--border-0)` or `var(--border-1)` by role. — Severity: MEDIUM
- [07. Panel Dividers] — assets/prompt_generator_v3.css:3129 — PG52 output separators used local `pg52` line tokens. — Before: section separators differed from route/details separators. — After: standard section dividers use `var(--border-1)`. — Severity: MEDIUM
- [07. Panel Dividers] — assets/calendar_fullscreen_fix.css:332 — Planner drawer separators used calendar-local translucent dividers. — Before: planner did not match generator/provider dividers. — After: planner drawer boundaries normalize to the shared divider colors. — Severity: MEDIUM
- [07. Panel Dividers] — assets/shelf_fix_v10.css:31 — Home slide head divider used a local white-alpha border. — Before: shell panel dividers did not match generator panel dividers. — After: live divider roles use shared border tokens when overridden by the component layer. — Severity: LOW

## 08. Compatibility / Score Indicators

- [08. Compatibility / Score Indicators] — assets/prompt_generator_v3.js:2985 — Model rating labels used `Excellent`, `Strong`, `Moderate`, `Limited`, `Weak`. — Before: terminology conflicted with the required dot language. — After: all dot indicators use `EXCELLENT`, `GOOD`, `MODERATE`, `TENSION`, `AVOID`. — Severity: HIGH
- [08. Compatibility / Score Indicators] — assets/prompt_generator_v3.js:6877 — Wardrobe-scene compatibility defaulted to `Good`. — Before: label casing and terms were inconsistent. — After: label is derived from dot count through `componentScoreLabelFromDots`. — Severity: HIGH
- [08. Compatibility / Score Indicators] — assets/prompt_generator_v3.js:6892 — Wardrobe compatibility used `Strong`. — Before: non-approved score term. — After: maps to `GOOD` based on dots. — Severity: HIGH
- [08. Compatibility / Score Indicators] — assets/prompt_generator_v3.js:6900 — Wardrobe compatibility used `Watch`. — Before: non-approved score term. — After: maps to `MODERATE`, `TENSION`, or `AVOID` based on dots. — Severity: HIGH
- [08. Compatibility / Score Indicators] — assets/prompt_generator_v3.css:6588 — Compatibility dots were 4px while model dots were 8px. — Before: same score job, different dot geometry. — After: `.pg52-compat-dots` and `.pg52-model-rating-dots` share dot size, gap, alignment, and label type. — Severity: HIGH
- [08. Compatibility / Score Indicators] — assets/prompt_generator_v3.css:7396 — Model rating dots used separate geometry and red-only active color. — Before: model score indicators did not match compatibility indicators. — After: model and compatibility dots share the same score-dot contract. — Severity: HIGH
