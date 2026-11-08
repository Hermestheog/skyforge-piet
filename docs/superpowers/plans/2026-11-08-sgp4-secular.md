# SGP4 zero-drag propagation implementation plan

> **For agentic workers:** Use superpowers:executing-plans for inline execution and a fresh final review.

**Goal:** Execute near-Earth SGP4 at nonzero times in Piet for the explicit B*=0 subset.

**Architecture:** Extend the existing assembler through an opt-in mode, preserving the epoch program's emitted instructions and pixels. A second PNG adds higher-precision un-Kozai recovery, secular J2/J2-squared/J4 rates and elapsed-time angle accumulation before the existing periodic state reconstruction. Test references remain independent and never supply values to the executable.

**Tech stack:** Piet, unmodified 64-bit npiet, Node assembly/tests, Docker.

**Spec:** This document defines the next milestone authorized by the user's instruction to keep developing SGP4 and update Git as needed.

## Constraints and interfaces

- Preserve the original circular, tracking and SGP4 epoch PNGs and their tests.
- `program({secular:true})` emits the new program; default `program()` must remain byte/pixel compatible.
- Inputs are the existing six scaled mean elements, elapsed seconds (-86400 through 86400), and B* times 1e9 (only zero accepted). Reject nonzero B* explicitly.
- Retain the epoch domain: 6.5–17 rev/day, e 0–0.25, i 0–170 degrees, other angles 0–360 degrees.
- Output status and TEME position in metres / velocity in mm/s. Status 1 and six zeroes for unsupported input or radius below Earth.
- General geometry remains scaled by 1e8. Mean motion uses 1e10; small secular rate corrections use 1e12. Store no persistent value outside signed 32-bit; transient products must fit signed 64-bit.
- Fix position and velocity tolerances at 20 m and 20 mm/s per component before implementation. Do not relax after failures.
- This is a zero-drag SGP4 subset, not atmospheric-drag or deep-space support. No TLE text parser or station conversion is added.

## Review focus

Positive/negative elapsed time, phase wrapping across many revolutions, zero/tiny eccentricity, exactly zero and rejected nonzero B*, every EOF branch, unsupported bounds, and inside-Earth positions. Preserve the distinction between original published TLE trajectories and references recomputed with B*=0.

## Tasks

- [x] Write `sgp4/secular-test.mjs`: independently verify the pinned oracle against published nonzero-time rows for the nine near-Earth TLEs; invoke the new PNG against the same mean elements with B*=0 at multiple signed times, boundary cases and seeded samples. Preserve the expected missing-PNG failure.
- [x] Add optional secular assembly mode and `sgp4/secular-build.mjs`. Preserve existing outputs, and run the new test through npiet. Record precision bugs with reproducible inputs and traces.
- [x] Add the new executable to rebuild checks, sequential suites and CI evidence. Document input scales, exact subset and measured errors; preserve logs.
- [ ] Run all suites and obtain a fresh review. Commit and push to the existing draft PR; verify CI and retain its outcome.

## Ledger

- Ruling: keep development on `codex/sgp4-near-earth` and PR #1; the user has authorized updates. Baseline tag v0.2.0 and the epoch milestone remain recoverable in Git.
- Ruling: explicitly reject nonzero B* rather than accepting an input whose physics is absent. Wider coefficient scales are introduced now to support secular precision; atmospheric-drag coefficients remain subsequent work.
- First PNG run: 98 valid and 36 invalid cases passed; maximum component errors 3.147844 m / 3.881826 mm/s. All five executable images rebuild identically. Existing epoch and earlier artifacts have no diff.
- Fresh independent review found no blocking issues. Applied its optional test hardening: require all 149 published nonzero-time oracle rows and all nine epoch rows. No thresholds or mathematical behavior changed.
- Complete six-suite run passed after review: `logs/runs/2026-11-08T20-10-40-607Z/`. All existing artifacts and results remain unchanged; the new suite adds 134 PNG executions.
