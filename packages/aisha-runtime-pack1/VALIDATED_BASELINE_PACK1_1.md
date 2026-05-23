# Validated Pack 1.1 Baseline

Tag:
- aisha-pack1-1-green

Validation:
- T61 Provenance Fixtures: 7 / 7 PASS
- T6 Extraction Fixtures: 3 / 3 PASS
- Parser Fixtures: 9 / 9 PASS
- Integration Fixtures: 2 / 2 PASS
- Default Fixtures: PASS

Key alignment:
- sync retrieval/context path reads persisted stale state only
- stale ranking penalty is ephemeral and non-persisted
- review budget is subject-scoped
- subjectScope is wired through persistReviewSignals call sites
