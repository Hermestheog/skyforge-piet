# Preserved work and current integration

Reconciled on 2026-11-11 against Git history, the working tree and saved logs.
This ledger distinguishes previously verified milestones from ongoing work.

| Milestone | Git evidence | Executable / checks |
|---|---|---|
| Earth/satellite circular program and two-body tracker | `d4dc42d`, baseline tag `v0.2.0` at `17b48c1` | `skyforge-orbit.png`, zoom PNG, `tracking/tracking.png`; 574 circular tests, 574 exact-output equivalence cases, full colored-block coverage, 80 tracking cases |
| Near-Earth SGP4 epoch | `1ac8735`, evidence `9249c84` | `sgp4/epoch.png`; 82 cases |
| Zero-B* time propagation | `5ca2fb7`, evidence `94ed3e2` | `sgp4/secular.png`; 134 cases |
| Variable atmosphere component | `b6bcf2d` | `sgp4/atmosphere.png`; 218 cases |
| cc1/cc2 component | `bdb548f` | `sgp4/drag.png`; 120 cases |
| cc4/cc5 component | `83d18df` | `sgp4/drag-ecc.png`; 520 cases |
| Full signed-B* integration | Explicit unfinished checkpoint, 2026-11-15 | `sgp4/full.png`, builder, listing, register/instruction maps, independent 625-case suite retaining all original 451 cases; validation in progress |

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
