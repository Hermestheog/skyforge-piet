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

## 2026-11-07 — tagged baseline and first SGP4 epoch kernel

Published annotated tag and release
[v0.2.0](https://github.com/Hermestheog/skyforge-piet/releases/tag/v0.2.0)
at `17b48c1cdce51e1f820f38913a765013bab827ef`, with the circular artwork and
two-body tracking PNGs as release assets. Started `codex/sgp4-near-earth` from
that commit; the stable baseline remains separate.

Implemented `sgp4/epoch.png`: WGS-72 un-Kozai initialization, generalized Kepler
solution, J3 long-period and J2 short-period corrections, and TEME vectors at
t=0, all computed by Piet instructions. The first domain is deliberately bounded:
6.5–17 rev/day, eccentricity 0–0.25, inclination 0–170 degrees. Elapsed-time
propagation, drag coefficients and deep-space terms are not implemented.

Pinned the independent upstream SGP4 port and published TLE/vector files at
`aholinch/sgp4` commit `552cb1489a52c3023ae70cb6c7e239e84c5950fe`. Recorded
source paths, SHA-256 hashes and license; test runs check hashes before use.
The reference is not imported by the assembler or used by the PNG runtime.

The initial red test failed with `SGP4 epoch executable PNG must exist`; its
actual output is preserved in `logs/2026-11-07/sgp4-epoch-initial-red.log`.
After assembly, all 82 cases passed in unmodified npiet: nine published epoch
vectors, 52 valid cases total and 30 rejected inputs. No numerical failures were
observed in that first run. The predeclared tolerances remain 20 m and 20 mm/s;
observed maximum component errors were 2.951859 m and 3.814783 mm/s.

Executable SHA-256:
`09b74bac128ca7b087c7d6721781d886be2d2dddd4015bbdf568273e64788c3c`.
The image is 4516×604 pixels and emits 89,441 core instructions, with six
physical EOF/unreadable-input branches. A full Vanguard execution trace is
archived as `logs/2026-11-07/sgp4-epoch-vanguard-first-pass.trace.txt.gz` with
its uncompressed hash in the adjacent metadata file.

Numerical design decisions retained for later work:

- The original square-root routine has a deliberately small result domain.
  SGP4 semimajor axes in Earth radii need a larger scaled result, so the new
  kernel supplies a separate 31-bit-result root without changing baseline code.
- The J3 longitude coefficient contains `1 + cos(inclination)` in its
  denominator. Near 180 degrees, the current fixed-point format loses precision;
  that region is explicitly rejected rather than silently evaluated.
- At t=0 the secular and drag time terms vanish. Passing epoch vectors therefore
  provides no evidence for nonzero-time propagation. Small drag coefficients
  require wider precision before that phase can be implemented.
- The generalized Kepler correction clamp is emitted defensively, but the
  bounded eccentricity domain does not require its ±0.95-radian branch. The
  initial plan's request to exercise that branch is deferred with wider-domain
  work; current tests exercise the solver across the accepted domain.

## 2026-11-08 — resume, review and regression verification

The first independent-review attempt stopped at a service usage limit and
produced no findings. On resumption, a fresh whole-branch review completed with
no blocking math, runtime, test-independence or documentation findings. It
recommended requiring the exact nine published satellite IDs rather than only
a minimum fixture count; that assertion was added without changing the PNG.

Pixel-for-pixel reassembly passed for all four executable images. The first
full-suite attempt on resumption did not start: Docker reported the missing
`dockerDesktopLinuxEngine` named pipe, and no Docker process was running.
Started the installed Docker Desktop in the background to restore the existing
test environment. This was an infrastructure interruption, not a numerical test
failure; no executable or tolerance was changed to address it.

After Docker became ready, the complete sequential `npm test` run passed:
574 circular checks, 574 exact-output equivalence comparisons, 100% colored
artwork coverage, 80 two-body tracking cases and 82 SGP4 epoch cases. All five
suite exit codes are zero in `logs/runs/2026-11-08T19-46-42-329Z/manifest.json`;
the corresponding stdout/stderr logs are retained beside it. The SGP4 maxima
match the first run. `git diff v0.2.0` confirms no changes to the original PNGs,
original test file, baseline directory, or tracking implementation/artifacts.

Pushed implementation commit `1ac873585b422cd2f1f67c70c06f1566ebecd995` and
opened [draft PR #1](https://github.com/Hermestheog/skyforge-piet/pull/1).
The connected GitHub integration could read repository metadata but its PR
creation call returned HTTP 403, `Resource not accessible by integration`.
The existing authenticated GitHub CLI successfully created the same authorized
draft PR. No repository permissions or token scopes were changed.

[The SGP4 PR CI run](https://github.com/Hermestheog/skyforge-piet/actions/runs/42517013604)
passed all steps at implementation commit `1ac8735`: unmodified interpreter
build, pixel-identical reassembly, all five test suites and evidence upload.
The returned job/step status is preserved in
`logs/2026-11-08/sgp4-epoch-first-ci.json`. This independently reproduces the
local run on GitHub's Linux runner. The complete public job log is retained as
`logs/2026-11-08/sgp4-epoch-first-ci.log`. The PR remains a draft for continued SGP4
development; `main` and the v0.2.0 baseline tag are unchanged.
Raw CI log whitespace is retained, including timestamped blank lines with trailing
spaces; the project's source/documentation whitespace check excludes that archive.

## 2026-11-08 — nonzero-time SGP4 with explicit zero drag

The user requested continued development after discussing the fixed-point
arithmetic. Added `sgp4/secular.png`, a second executable SGP4 image accepting
the six mean elements, elapsed seconds within ±86400, and an explicit B* field.
Only B*=0 is supported; positive and negative nonzero values are rejected.
This is the near-Earth zero-drag subset, not atmospheric-drag support.

The assembler now has an opt-in secular mode. Default assembly reproduces the
epoch PNG's existing SHA-256 exactly. The new image adds higher-precision
un-Kozai initialization and the J2/J2-squared/J4 secular rates for mean anomaly,
argument of perigee and node, then uses the existing periodic reconstruction.
Most geometry stays at 1e8 scale; mean motion uses 1e10 and small rate
corrections use 1e12. Large unwrapped mean angles are reduced before storing
them, preserving npiet's signed-32-bit roll constraint. The largest high-scale
mean-motion product remains below signed 64-bit within the input domain.

Test-first evidence: the new test initially failed with `SGP4 zero-drag
executable PNG must exist`; actual output is retained in
`logs/2026-11-08/sgp4-secular-initial-red.log`. The first assembled image passed
98 valid cases and 36 rejected inputs with no observed numerical failures.
Tests include negative/positive time, ±one-day boundaries, tiny eccentricity,
phase wrapping, unsupported B*, and each of eight input failure branches.
Fixed preimplementation limits remain 20 m / 20 mm/s per component; measured
maxima were 3.147844 m / 3.881826 mm/s. The complete first test output is in
`logs/2026-11-08/sgp4-secular-first-pass.log`.

Reference distinction: the independent upstream implementation was verified
against 158 original published rows, including 149 nonzero-time rows, with each
original TLE's B* unchanged. The PNG itself is compared with vectors recomputed
by that verified oracle with B*=0. Those recomputed vectors are not claimed to
be the original published drag-affected trajectories.

New executable: 6094×492 pixels, 91,907 core instructions, eight error branches.
SHA-256: `48a9a2948971e9e4aa41fd6243323d94601a27037472a6091a3401398a86d419`.
A full execution trace for Vanguard with B*=0 at +86400 seconds is archived as
`logs/2026-11-08/sgp4-zero-drag-vanguard-day-first-pass.trace.txt.gz`, with
adjacent metadata and the uncompressed content hash.

Independent review found no blocking math, overflow, test-independence or
documentation issues. Its suggested hardening was applied: the oracle test
now requires exactly 149 nonzero-time rows plus nine epoch rows, rather than
merely requiring more than 100 nonzero-time rows. No physics or numerical
tolerances changed in response to review.

Full regression verification passed after the review change: all six suites
exited zero in `logs/runs/2026-11-08T20-10-40-607Z/manifest.json`, with complete
suite logs retained beside it. This includes the 574 original checks, 574
exact-output comparisons, full artwork coverage, 80 tracking tests, 82 epoch
tests, and 134 zero-drag propagation tests. Pixel rebuild verification passed
for all five executable images. The original circular, tracking and epoch PNGs,
their generated artifacts and existing numerical test results remain unchanged.

## 2026-11-09 — zero-drag milestone publication verified

Implementation commit `5ca2fb77555ef9a93e5fb3e6a8c3e4b28ed366ae` is pushed to
[PR #1](https://github.com/Hermestheog/skyforge-piet/pull/1), whose description now
covers the epoch kernel and B*=0 time propagation. [GitHub CI run 42519147945](https://github.com/Hermestheog/skyforge-piet/actions/runs/42519147945)
passed every step: unmodified npiet build, all five image rebuilds, all six test
suites and evidence upload. Its job/step summary and complete public job log
are preserved in `logs/2026-11-09/sgp4-zero-drag-ci.json` and `.log`.

The previous optional attempt to run the documented example command did not
execute: automatic approval review hit a service usage limit. The review
explicitly said this was an inability to complete review, not a determination
that the action was unsafe. No approval mechanism was bypassed. On resumption,
the same command passed normal approval and ran successfully with networking
disabled and the repository mounted read-only. Its direct npiet output was:

```text
0 -938574 -6268186 -4294031 7536102 -427138 989870
```

No JavaScript test runner supplied those values. The command read the eight
integers from `examples/sgp4-vanguard-zero-drag-day.txt` and executed
`sgp4/secular.png` directly. No code, PNG, test threshold or reference fixture
changed during this publication verification. Atmospheric drag remains the
next physics milestone; nonzero B* is still rejected by this executable.

## 2026-11-09 — atmosphere initialization component

Added a separate executable `sgp4/atmosphere.png` for the altitude-dependent
s4/qoms24 parameters and the simplified-drag flag. It follows the pinned
Vallado sgp4init block, including strict 98/156/220 km thresholds. It accepts
perigee in metres; deriving that input inside the full propagator is future
integration work. Nonzero B* propagation remains unsupported.

The initial test failed because the executable PNG was absent; actual output
is retained in `logs/2026-11-09/atmosphere-initial-red.log`. The first image
passed 214 valid and four invalid cases in unmodified npiet, with thresholds
fixed before implementation. No numerical failure was observed. The image has
629 emitted instructions and measures 472x161 pixels. A scaled-square sequence
avoids overflowing a direct fourth power. The component is included in the
sequential test runner and reproducible-image check; previous images are intact.

Independent review found no blocking issues. All seven suites passed; logs are retained in logs/runs/2026-11-09T23-13-10-598Z/. Atmosphere PNG SHA-256: 45d99db161341d4aca32ee0605515d27dabd74655c6d84326030bff4c19c4cc4. The review suggested adding the hash directly to future test reports; this entry records it for this run.

## 2026-11-09 — first cc1/cc2 drag coefficient kernel

Added sgp4/drag.png, a bounded coefficient kernel using recovered orbital
quantities and signed B*. It does not yet implement drag-affected propagation.
The initial missing-image test and first numerical failure are preserved under
logs/2026-11-09/drag-coefficient-*.log.

First failure: input 8000000 0 0 529401726 -1000000 returned cc2=3708;
reference was 3714.7985423622117 in scale 1e11. The fourth-power coefficient
was rounded prematurely at scale 1e9. Raising that internal scale to 1e11
fixed the failure without changing the predeclared tolerance (5 output units
plus 0.01%). All 99 valid and 21 invalid coefficient cases then passed.
The domain keeps perigee >=200 km, so the fixed s=78 km atmosphere applies.
Further coefficients and propagation integration remain future work.

Full eight-suite regression passed, with all exit codes zero in
logs/runs/2026-11-09T23-28-00-506Z/manifest.json. All seven executable images
rebuild identically. The independent review attempt hit a service usage limit
and returned no findings; it must not be counted as a completed review.
Manual arithmetic review confirmed the coefficient scales against the pinned
formula. Using d=aR-78km and the perigee bound gives ae<=d-122km;
this bounds the 1e11-scaled coef below 8e8 throughout the declared domain.
The coef*mean-motion product is consequently below 6e17, within int64.
This manual review supplements the numerical tests, not an independent review.

## 2026-11-09 — cc4/cc5 eccentricity drag milestone

Added a separate drag-ecc.png with cc4 and cc5, preserving the previous cc1/cc2
PNG and tests. It takes argument of perigee as a sixth input and outputs cc2,
cc1, cc4, cc5 at documented fixed-point scales. The first test failed for the
missing image; its output is retained in drag-ecc-initial-red.log. The assembled
image passed 495 valid and 25 invalid cases at unchanged tolerances. No numerical
failure was observed in this increment.

Independent review completed successfully for cc1/cc2/cc4/cc5 formulas and bounds.
It found a documentation error in DRAG.md's canceled expression: the denominator
must be a*R-R-s, not a*R-s. The code already subtracted R+78km correctly. Fixed
the documentation only; no executable behavior changed in response to review.
Nonzero-B* state propagation is still not implemented by these kernels.

All nine regression suites passed, including 520 new cases. Full run logs and zero exit codes are retained in logs/runs/2026-11-10T00-55-26-808Z/. All eight executable images rebuilt identically. Existing PNGs and test results remain unchanged.
