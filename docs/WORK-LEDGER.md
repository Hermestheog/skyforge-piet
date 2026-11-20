# Preserved work and current integration

Reconciled on 2026-11-20 against Git history, the working tree and saved logs.
This ledger distinguishes previously verified milestones from ongoing work.

## Current published state

- `main`: `17b48c1`, the `v0.2.0` baseline.
- Development branch: `codex/sgp4-near-earth`, open PR #1; not merged.
- Verified milestone: `v0.3.0` at `a85cbd4323a9932601a5632f93f8b236d1067850`.
  Its final CI run 44425070199 passed all eleven suites and reproducibility checks;
  retained evidence: `logs/2026-11-18/final-ci-validation.log`.
- Subsequent verified component: deep-space epoch/time component, executable PNG,
  independent oracle tests, 256-case passing standalone report and failure traces.
  See `sgp4/DEEP-TIME.md`. This addition is now included in `npm test`,
  aggregate build/rebuild checks and CI artifact lists. Full twelve-suite acceptance passed for `f37d138` in CI run 44834509587.
  A fresh review completed and its two contract/test findings were addressed;
  the earlier interrupted review remains recorded in the development log.
- Full SDP4, lunar/solar dynamics, resonance propagation, TLE parsing and SGP4
  observer geometry remain unfinished. The checkpoint does not advance the tag.

| Milestone | Git evidence | Executable / checks |
|---|---|---|
| Earth/satellite circular program and two-body tracker | `d4dc42d`, baseline tag `v0.2.0` at `17b48c1` | `skyforge-orbit.png`, zoom PNG, `tracking/tracking.png`; 574 circular tests, 574 exact-output equivalence cases, full colored-block coverage, 80 tracking cases |
| Near-Earth SGP4 epoch | `1ac8735`, evidence `9249c84` | `sgp4/epoch.png`; 82 cases |
| Zero-B* time propagation | `5ca2fb7`, evidence `94ed3e2` | `sgp4/secular.png`; 134 cases |
| Variable atmosphere component | `b6bcf2d` | `sgp4/atmosphere.png`; 218 cases |
| cc1/cc2 component | `bdb548f` | `sgp4/drag.png`; 120 cases |
| cc4/cc5 component | `83d18df` | `sgp4/drag-ecc.png`; 520 cases |
| Full signed-B* integration | Checkpoints `ee0e31c`, `c3905de`; verified 2026-11-18 | `sgp4/full.png`, builder, listing, register/instruction maps; all 636 cases pass, retaining all original 451 |

All nine earlier suites have a saved passing manifest at
`logs/runs/2026-11-10T00-55-26-808Z/manifest.json`. The eight pre-existing PNG
files were rehashed on 2026-11-11 and match the pre-integration snapshot exactly,
retained in `docs/pre-integration-png-sha256.json`.
All nine earlier test files and the vendored interpreter were also compared
byte-for-byte with Git commit `83d18df`; every comparison passed.
Earlier development log entries and archived traces remain intact.

Current integration ownership and files:

- `sgp4/program.mjs` enables full mode without changing default/zero-drag modes.
- `sgp4/full-drag.mjs` emits the integrated drag calculation.
- `sgp4/wide-registers.mjs` emits split storage for wide intermediates.
- `sgp4/full-build.mjs` produces the PNG and audit artifacts.
- `sgp4/full-test.mjs` independently checks published states, signed-B* grids,
  boundaries, seeded cases and error packets. It never imports the assembler.
- Build, sequential test, reproducibility and CI artifact lists include full mode.
- `sgp4/FULL.md` states the current validation status and executable interface.
- `docs/DEVELOPMENT-LOG.md` and `logs/2026-11-11/` preserve observed failures.

Diagnostic `.work/` programs are not production runtime or acceptance evidence.
Useful failure records have been compressed into tracked logs. Reference state
generation remains test-only; no host language replaces the PNG computation.

The implementation, test and review agents encountered service usage limits on
2026-11-11. Their saved work was retained and inspected; the root agent continued
debugging and verification. The interrupted review is **not** a completed review.
No full-integration completion claim or release tag follows from partial tests.

Final acceptance was confirmed on 2026-11-18 from GitHub run 43756865368:
all eleven suites pass and all executable source pixels rebuild identically.
The 636-case report matches the final PNG hash; CI logs are preserved in
`logs/runs/2026-11-15T20-14-15-222Z/`. The separate local 633-case pre-guard run
also passed and is retained without attributing its results to the final image.
All review findings with concrete reproducers were addressed before acceptance.

## Lunar orientation accepted — 2026-11-20

Source 9ba039e, CI 44837670212: all thirteen suites and all eleven executable
image rebuilds pass. The lunar suite contains 353 valid and 8 invalid cases;
maximum component error 6.165933641444354e-8 at the fixed 5e-7 limit.
Independent review found no critical/important defects. The unit-circle diagnostic finding was subsequently resolved: all three pair
failure paths preserve detailed packets and identify the input in the assertion.
Permanent evidence: logs/runs/2026-11-20T23-34-05-986Z/ and sgp4/lunar-test-results.json.
All twelve pre-existing PNG files (including reference artwork) compare exactly
to bd015b8; shared production math and vendored interpreter are unchanged.
The next step is full dscom common coefficients. Periodic and resonance dynamics
remain unimplemented. This component is not a full SDP4 propagator.
