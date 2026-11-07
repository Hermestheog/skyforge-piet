# Development log

Keep this history. Append findings and corrections; do not rewrite failed work
as if it passed on the first attempt. Record unexpected behavior even when it
turns out to be a tool/environment issue. Never include credentials or tokens.

## 2026-11-06 — executable circular-speed prototype

**Request:** Compute an orbital quantity in an actual executable Piet PNG, then
validate it using an unmodified third-party interpreter.

- Chose circular Earth-orbit speed, whole m/s, radius in km, mu=398600.
- Original PNG: 599 instructions, 601×11 pixels. SHA-256:
  `6cc02d3ffde1d64147ac90b01d4b4e249ecfc9ff5ae7e7fdf73ea1ca9c29ad3e`.
- Windows npiet 1.3a failed before execution with **Illegal System DLL
  Relocation**. Its old Cygwin runtime could not load on this host. Switched to
  unmodified npiet 1.3h, compiled with libpng inside Linux Docker.
- Shell downloads initially failed DNS inside the restricted sandbox; approved
  network access resolved it. WSL inventory showed Docker Desktop only.
- Factored the squared-speed division into quotient and remainder to avoid a
  large constant and preserve 32-bit compatibility in the first program.
- The initial test failed because the PNG did not exist. After implementation,
  all **574 numeric checks passed**; a PNG-only mount also returned 7546 for 7000.

## 2026-11-06 — Earth/satellite executable artwork

**Request:** Preserve all behavior while making the executable blocks resemble
Earth and an orbiting satellite; do not hide the old strip under a picture.

- Built 660 illustrated instruction tiles. All 597 original computational
  instructions remain in order: 401 in Earth, 148 in the ring, 48 in the satellite.
  The old strip's two final routing instructions were replaced with layout turns.
- Added 63 stack-neutral padding and 138 push/pointer routing instructions.
- New PNG: 944×730. SHA-256:
  `5df9d055f88ad23f30c758647b8ad06239cb70c4871038824b462ee51a77d09d`.
- **Timeout investigation:** running the original suite and equivalence suite
  concurrently caused the 6× PNG case to exceed the original five-second limit.
  Isolated timings were 104 ms (base) and 2912 ms (6×). This was resource
  contention, not wrong numerical output. Kept the PNG and timeout unchanged;
  sequential rerun passed all 574 checks. Suites must run sequentially.
- Direct old/new comparison passed all 574 cases. Real-trace coverage found
  all 1529 colored components / 122045 colored pixels executed. A reviewer
  independently checked transitions and operation order.

## 2026-11-06 — standalone repository and two-body tracker

**Request:** Start the full simplified tracking pipeline and publish a public
repository named `Hermestheog/skyforge-piet`. SGP4 is explicitly a later stage.

- Created a separate local repository, preserving the existing SkyForge working
  files. User selected a public repository.
- GitHub authentication looked invalid inside the sandbox. With approved
  network access the existing login worked; no credentials were changed.
- Wrote failing PNG-level tests first (`Executable tracking PNG must exist`).
- Model: elliptic two-body Earth orbit, e<=0.5, time +/-one day, rotating spherical
  Earth, explicit epoch Earth angle, ENU look angles, range rate, Doppler.
- The assembler emits Piet; the floating-point reference is test-only.

### BUG-001 — input parser is narrower than the stack

**Finding:** Upstream npiet 1.3h uses `int c` and `%d` for `in(number)`, despite
using `long` stack storage. A 10 GHz carrier cannot be entered directly in Hz.

**Fix:** Enter carrier in integer kHz (0..10000000). All input fields now fit
signed 32-bit. Piet performs the necessary unit arithmetic. Document the units
in the contract; test both carrier bounds and out-of-range values.

### BUG-002 — roll silently truncates wide values

**Observed failure:** equatorial zenith velocity y was 0 instead of approximately
7546049 mm/s. The trace showed `speed4=0`, `root=43300`, `range=12904`.

**Root cause:** both directions of npiet's `roll` use an `int val` temporary.
Although arithmetic uses 64-bit longs, moving wide stored values through roll
truncates them. The interpreter was not patched.

**Fix:** Keep persistent registers signed 32-bit. Evaluate large square-root
radicands as temporary expressions instead of storing them. Scale CORDIC vectors
by 8 rather than 1000000. Keep carrier in kHz. Wider temporary operands are only
shifted, never selected as the transported value by roll. Arithmetic still
requires a 64-bit build. The wide EOF sentinel is discarded or triggers an
error branch before it can become a transported register.

### BUG-003 — incorrect inclined-orbit matrix entry

**Observed failure:** the polar north-pole case reported azimuth 90000 instead
of the undefined sentinel -1. Its position was `(0,7000000,7000000)`; expected
`(0,0,7000000)`.

**Investigation:** initially suspected trig error near a pole. Improved sine
range reduction to [-pi/2,pi/2] and clamped its result to [-1,1], but the test
still failed. A full trace showed `ic=1` (scaled near-zero cosine) while
`qy=100000000`; that isolated the rotation matrix, not the inverse trig.

**Root cause:** qy incorrectly applied cos(i) to the sin(Omega)sin(omega) term.
It must be `cos(Omega)cos(omega)cos(i) - sin(Omega)sin(omega)`.

**Fix:** Corrected the matrix entry. Kept the useful trig range-reduction change.
The polar and inclined/eccentric tests now cover this regression.

**Preserved evidence:** `logs/2026-11-07/polar-matrix-failure.trace.txt.gz` is the
actual pre-fix interpreter trace, not a reconstruction. It corresponds to PNG
SHA `56247409c081c5e1d3ac22d4368b4083970cacbb96830350c5ec1b392f409d12`.
Archive filenames use UTC; this development entry uses the user's local date.

### Tooling stumble — build error followed by stale-image test

A missing closing parenthesis in the trig clamp caused a JavaScript syntax
error during assembly. A subsequently issued test command ran the previous
PNG and reproduced its old polar failure. Fixed the syntax and made dependent
test dispatch conditional on successful assembly. CI and the rebuild checker
also fail immediately when assembly fails.

### First green tracking run

The initial 40 valid + 26 invalid/EOF cases passed in unmodified npiet. Largest
observed coordinate component error was 14.596 m, range error 6.623 m, velocity
component error 8.271 mm/s, range-rate error 5.491 mm/s, and Doppler error
1.023 Hz. These are sampled errors against the simplified model, not universal
bounds or SGP4 accuracy claims.

Expanded the suite to exercise every physical EOF branch and malformed tokens.
Final suite results and publishing/CI outcomes are recorded below as they finish.

### Complete local verification

The sequential full command passed: 574 original checks, 574 original/artwork
equivalence checks, full colored-block coverage, and 80 tracking cases (40 valid,
40 invalid/EOF/unreadable tokens). Each of the twelve physical EOF branches was
executed. Both approaching and receding Doppler signs are represented.

**Parser caveat:** npiet uses C `%d` semantics and may accept a numeric prefix
before trailing garbage, especially in the final field. The contract requires
integer tokens and explicitly documents that limitation; tests do not claim
strict tokenization beyond the underlying interpreter.

## Ongoing logging convention

Final independent review found no remaining substantive defects. The reviewer
also flagged the numeric-prefix parser caveat; documentation was aligned with
the actual C parser. Rebuilding in the Docker Node environment reproduced every
pixel of all three executable PNGs, with identical source hashes.

Two documentation patch attempts were rejected atomically (duplicate target
operations and a mismatched context). The affected files were inspected and
the patches reapplied; no executable artifacts changed.

For each finding, record: observed symptom, exact case, expected/actual values,
root cause or current hypothesis, fix, regression coverage, and status. Keep
superseded hypotheses visible. `npm test` saves per-suite output and a manifest
under `logs/runs/<UTC timestamp>/`; ignored live traces can be archived with
`node scripts/archive-trace.mjs <source> <label>` when they explain a finding.

## 2026-11-07 — public publication and CI

Published [Hermestheog/skyforge-piet](https://github.com/Hermestheog/skyforge-piet)
as a public repository, with `main` as default branch. Initial source commit:
`d4dc42df6acd6d4ee049f82019afa3fea847273f`.

[First GitHub CI run](https://github.com/Hermestheog/skyforge-piet/actions/runs/42383657340)
**passed** in 1m13s, including the unmodified interpreter build, pixel-for-pixel
reassembly, all 574 original checks, 574 equivalence comparisons, artwork
coverage, and all 80 tracking tests. Test logs were uploaded even-on-failure
by design; this run's per-suite logs and manifest were downloaded into
`logs/runs/` for permanent Git history. A complete passing eccentric-case trace
is archived as `logs/2026-11-07/first-passing-ci-eccentric.trace.txt.gz`.

CI emitted an informational notice about the `ubuntu-latest` migration to Ubuntu
26. It did not affect this run. The Docker-based interpreter and pixel rebuild
check remain the reproducibility boundary.

The initial whitespace check flagged whitespace in the unmodified upstream
npiet source/license. It was intentionally retained to preserve source hashes;
the project's own files passed `git diff --check` excluding `vendor/`.

Added AGENTS.md and CONTRIBUTING.md to carry the user's logging preference into
future work. The follow-up commit adds only guidance, publication notes and CI
evidence; it uses `[skip ci]` because no executable source or tests changed.
