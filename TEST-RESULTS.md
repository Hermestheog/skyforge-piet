# Piet execution results — executable Earth redesign, 2026-11-06

**PASS: 574 numerical checks**, executed by unmodified **npiet v1.3h**, built
from upstream C source with libpng in a Linux Docker container. No custom
interpreter was used. Every invocation exited normally with status 0, no
warnings, and a five-second timeout. There was no interpreter step limit.

The tests run `npiet -q -w -cs 1 skyforge-orbit.png`, supply the radius on stdin,
and check stdout. The enlarged PNG is tested with `-cs 6`.

| Case | Radius from Earth's centre (km) | Piet output (m/s) | Analytical reference, mu=398600 (m/s) | JPL-GM reference (m/s) |
|---|---:|---:|---:|---:|
| Lower bound | 6378 | 7905 | 7905.446241 | 7905.450560 |
| LEO, 400 km altitude using R=6378 km | 6778 | 7668 | 7668.631425 | 7668.635615 |
| LEO | 7000 | 7546 | 7546.049108 | 7546.053231 |
| MEO | 26560 | 3873 | 3873.955359 | 3873.957475 |
| GEO | 42164 | 3074 | 3074.664580 | 3074.666260 |
| Upper bound | 100000 | 1996 | 1996.496932 | 1996.498023 |

References in the last two columns are independently evaluated analytical
values from `1000*sqrt(mu/r)` in the test harness, not measured ephemeris data.
The PNG computes its own answer from the input using Piet integer arithmetic.
The JPL column uses Earth GM = 398600.435507 km³/s² from
[NASA/JPL's DE440 parameters](https://ssd.jpl.nasa.gov/astro_par.html).

As an external published sanity check,
[Bryan Weber's circular-orbit reference](https://orbital-mechanics.space/the-orbit-equation/circular-orbits.html)
gives GEO radius 42164 km and speed approximately 3.075 km/s. The analytical
value here rounds to that value. Piet deliberately **floors** to whole m/s,
so it emits 3074 rather than rounding to 3075.

Coverage:

- 6 named reference cases above.
- 542 radii from 6378 through 99971 km in increments of 173: all match the
  floor of the analytical model. Largest sampled error before flooring:
  **0.997933944 m/s**.
- 14 checks around exact integer-speed transitions for speeds 2000, 2500,
  3075, 4000, 6000, 7500, and 7900 m/s.
- 6 invalid radii: -2147483648, -1, 0, 6377, 100001, 2147483647: all emit `-1`.
- 6 named cases repeated against the executable 6× PNG: identical results.
- An additional traced GEO run confirms actual divide, multiply, comparison,
  output, and pointer operations; the trace is saved in `geo-trace.txt`.

Within the documented radius range, flooring contributes less than 1 m/s of
error relative to the simplified model. Rounding JPL GM to 398600 contributes
less than 0.0044 m/s, giving a combined bound of **less than 1.005 m/s** relative
to the analytical JPL-GM circular model. This is a numerical bound, not a claim
of orbit-prediction accuracy for real satellites.

The preserved original PNG and its test files are in `baseline/`. The original
`test.mjs` has not been changed (SHA-256
`a5eddf20bf11f02521d6a5112234961e1262aa216ce991969d6a92f76805c779`).

`equivalence.mjs` executes both original and redesigned images with unmodified
npiet and compares **all 574 cases**, including all six 6× image cases. All
stdout values are byte-identical (including newline), all runs exit normally,
and all have empty stderr. `equivalence-results.json` records each pair.

The image contains 597 preserved computational instructions, distributed across
401 Earth blocks, 148 orbital-ring blocks, and 48 satellite blocks. It adds 63
stack-neutral padding instructions and 138 standard push/pointer instructions
for layout turns. The original final push/pointer pair was only routing and is
replaced by the new layout's turn into the blocked terminal block.

The first concurrent run of the unchanged suite timed out in a 6× case. An
isolated measurement took 104 ms for the base image and 2912 ms for the 6×
image. Run the two interpreter suites sequentially to avoid that contention;
the unchanged suite retains its original five-second per-run timeout.
The sequential rerun passed all 574 checks without changing the PNG, tests,
or timeout.

`verify-layout.mjs` passed against the new real GEO trace:

- All **1529 colored blocks / 122045 colored pixels** are on the executed path.
- All **597 original computational instructions** execute once, in order.
- Every push block has its exact intended area.
- `layout-verification.json` records the coverage and source-image hash.

A final standalone run mounted only the redesigned PNG, read-only, with
network disabled. Input `7000` produced exactly `7546` plus newline, exit 0,
with no assembler or test scripts available to the interpreter.

Artifact SHA-256:

```
5df9d055f88ad23f30c758647b8ad06239cb70c4871038824b462ee51a77d09d
```

The machine-readable results are in `test-results.json`. Reproduction commands
are in `README.md`. Only this standalone Piet artifact suite was run; the
unrelated SkyForge .NET/UI suite was not part of this verification.
