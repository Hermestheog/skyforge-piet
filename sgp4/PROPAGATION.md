# SGP4 propagation with B* = 0

[secular.png](secular.png) advances the bounded near-Earth SGP4 model by up to
one day before or after the epoch. It computes the un-Kozai mean motion,
J2/J2-squared/J4 secular rates, generalized Kepler solution, J3 long-period
corrections and J2 short-period corrections entirely inside executable Piet.

This is the **B*=0 subset of near-Earth SGP4**. Atmospheric drag and deep-space
terms are not implemented. An explicit nonzero B* input is rejected, so this
program cannot silently discard a supplied drag value. Setting a real TLE's B*
to zero changes its modeled trajectory; do not interpret that output as full
SGP4 propagation of the original TLE.

The original [epoch executable](README.md) remains unchanged, with the same
hash and its existing test suite. Neither PNG needs JavaScript or Python at
runtime; npiet executes the actual color transitions and stack operations.

## Inputs and execution

Supply eight whitespace-separated decimal integers:

| Field | Scale and accepted range |
|---|---|
| Mean motion | rev/day × 1e8, 650000000–1700000000 |
| Eccentricity | eccentricity × 1e7, 0–2500000 |
| Inclination | degrees × 1e4, 0–1700000 |
| RAAN | degrees × 1e4, 0–3600000 |
| Argument of perigee | degrees × 1e4, 0–3600000 |
| Mean anomaly at epoch | degrees × 1e4, 0–3600000 |
| Elapsed time | seconds, -86400–86400 |
| B* | inverse Earth radii × 1e9; **only 0 supported** |

From the repository root, using the Docker image built from the included
Dockerfile:

```sh
docker build -t skyforge-piet .
docker run --rm -i --network none -v "$PWD:/work:ro" skyforge-piet -q -cs 1 sgp4/secular.png < examples/sgp4-vanguard-zero-drag-day.txt
# Native unmodified 64-bit npiet:
npiet -q -cs 1 sgp4/secular.png < examples/sgp4-vanguard-zero-drag-day.txt
```

PowerShell:

```powershell
$pietDir = (Get-Location).Path
Get-Content examples/sgp4-vanguard-zero-drag-day.txt | docker run --rm -i --network none --mount "type=bind,source=$pietDir,target=/work,readonly" skyforge-piet -q -cs 1 sgp4/secular.png
```

The example returns Vanguard's zero-drag state one day after epoch:

```text
0 -938574 -6268186 -4294031 7536102 -427138 989870
```

Output is **status, TEME x/y/z in metres, TEME vx/vy/vz in mm/s**. Status 0
indicates success. Unsupported bounds, nonzero B*, missing/unreadable tokens,
or an output radius below Earth produce `1 0 0 0 0 0 0`. This kernel uses its
own single error code. It does not model collision history between the epoch
and the requested instant.

Use signed-32-bit integer tokens. As with the other executables, npiet's C
input routine can accept a numeric prefix before junk, and extra tokens after
the eighth are ignored. There is no TLE text parser or automatic time/frame
conversion in this PNG.

## Numerical design

This remains fixed-point arithmetic, not IEEE floating point. General geometry
uses scale 1e8. Mean motion and un-Kozai correction calculations use scale
1e10; small secular rate corrections use scale 1e12. These scales retain terms
that would otherwise be severely quantized before multiplication by elapsed
time. Mean anomaly is wrapped before storage because an unwrapped full day
can exceed the signed-32-bit register range.

Persistent stack registers fit signed 32-bit for npiet's `roll` transport;
direct intermediate products use its signed-64-bit arithmetic. In particular,
the mean-motion domain keeps the largest `nkH * 1e10` product below 2^63.
The period, eccentricity and inclination bounds remain deliberate limits of
this implementation, not a statement that SGP4 itself has those limits.

## Independent verification

`node sgp4/secular-test.mjs` invokes the PNG in unmodified npiet with positive,
negative and zero times, domain boundaries, seeded element samples, rejected
nonzero B*, and every EOF/unreadable-input branch. Before implementation,
component tolerances were fixed at **20 m and 20 mm/s**.

Two comparisons serve different purposes:

- The pinned upstream oracle is checked against published `tcppver.out` rows
  using the nine original near-Earth TLEs **with their original B***, including
  nonzero times. Its per-component thresholds are 0.02 m and 0.02 mm/s.
- The PNG is compared against that independently verified oracle with **B*=0**
  explicitly set for each input. Those recomputed nonzero-time vectors are not
  described as the original published trajectories.

Exact counts, inputs, errors and artifact hash are in
[secular-test-results.json](secular-test-results.json). The existing epoch suite
continues to compare its PNG directly with nine published epoch vectors.
The first new suite run passed **98 valid and 36 rejected cases**. Observed
maximum component errors were **3.148 m and 3.882 mm/s**, below the predeclared
20 m / 20 mm/s limits. The upstream oracle matched 158 published rows, including
149 at nonzero times. These measurements are test results, not a global accuracy
guarantee over every supported input.
All suites run sequentially under `npm test`; all five executable images are
included in `node scripts/rebuild-check.mjs`.

On a numerical failure the new test saves the exact input, output, reference,
PNG hash and actual interpreter trace. Relevant traces are archived and the
diagnosis recorded in [the development log](../docs/DEVELOPMENT-LOG.md).

The next physics step is atmospheric drag, including its small coefficients
and higher powers of elapsed time, followed by direct nonzero-time comparisons
against the original published TLE trajectories.
