# Working on SkyForge Piet

- The user wants development history preserved. Append each meaningful bug,
  failed hypothesis, interpreter quirk, fix and verification outcome to
  `docs/DEVELOPMENT-LOG.md`. Do not remove prior failures after fixing them.
- Record exact inputs, expected/actual outputs, root cause or current hypothesis,
  affected artifact hash, regression test, and final status when available.
- Keep relevant diagnostic traces: compress them with
  `node scripts/archive-trace.mjs <source> <label>`. Do not commit credentials,
  machine secrets, or unrelated personal data. Do not overwrite old archives.
- Run `npm test` with unmodified 64-bit npiet on PATH, or use Docker as described
  in README. Suites must run sequentially. The runner preserves per-suite logs.
- Do not modify npiet to make a program pass. All runtime orbital math belongs
  in the executable PNG. JavaScript is allowed for assembly and independent tests.
- Preserve the original circular PNGs and 574-case test suite. New tracking
  capabilities get additional tests. Do not relax thresholds to conceal failures.
- Assembly must succeed before testing newly generated artifacts. Use
  `node scripts/rebuild-check.mjs` to verify reproducible pixels.
- Keep the mathematical model and its limitations explicit. Do not label the
  two-body implementation SGP4. Follow `docs/ROADMAP.md` for subsequent milestones.
- Before committing, inspect generated artifacts and logs. Retain the vendored
  interpreter byte-for-byte, including its upstream whitespace and license.
