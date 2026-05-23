# Move 1 Live Generator Baseline

Branch:
- move1-live-generator

Commit:
- fc8cde3

Validation:
- targeted TypeScript compile: PASS
- T6 Extraction Fixtures: 3 / 3 PASS
- Integration Fixtures: 2 / 2 PASS
- Parser Fixtures: 9 / 9 PASS

Scope:
- real Gemini generator adapter
- prompt template
- production parser
- production runtime builder
- runtime validator

Notes:
- kept async extraction out of the new live generator lane for now
- preserved bounded hot-path discipline
- branch is intended as the live generation floor, not the final arbitration layer
