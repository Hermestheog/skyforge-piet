# SGP4: first executable epoch kernel

[epoch.png](epoch.png) is an actual Piet program. Run it directly with unmodified
64-bit npiet 1.3h. Every input-dependent calculation happens in the image:
WGS-72 un-Kozai mean-motion recovery, semimajor axis via cube-root iteration,
generalized Kepler solving, J3 long-period corrections, J2 short-period
corrections, and TEME position/velocity at **t = 0**.

This is the first bounded SGP4 component, **not a complete propagator**. There is
no elapsed-time input, B* drag, secular time evolution, deep-space model,
TLE text parser, time conversion, or station tracking in this PNG. The separate
two-body tracker remains available. The new image is a dense executable layout;
the original Earth/satellite artwork remains unchanged.

## Run

From the repository root, build the existing Dockerfile:

```sh
docker build -t skyforge-piet .
docker run --rm -i --network none -v "$PWD:/work:ro" skyforge-piet -q -cs 1 sgp4/epoch.png < examples/sgp4-vanguard-epoch.txt
# Or, with a native 64-bit interpreter:
npiet -q -cs 1 sgp4/epoch.png < examples/sgp4-vanguard-epoch.txt
```

PowerShell:

```powershell
$pietDir = (Get-Location).Path
Get-Content examples/sgp4-vanguard-epoch.txt | docker run --rm -i --network none --mount "type=bind,source=$pietDir,target=/work,readonly" skyforge-piet -q -cs 1 sgp4/epoch.png
```

The Vanguard example returns:

```text
0 7022466 -1400083 39 1893840 6405891 4534805
```

Provide six whitespace-separated signed-32-bit decimal integer tokens:

| Field | Scale | Accepted domain |
|---|---|---|
| TLE mean motion | rev/day × 100000000 | 650000000–1700000000 |
| TLE eccentricity | eccentricity × 10000000 | 0–2500000 |
| Inclination | degrees × 10000 | 0–1700000 |
| RAAN | degrees × 10000 | 0–3600000 |
| Argument of perigee | degrees × 10000 | 0–3600000 |
| Mean anomaly | degrees × 10000 | 0–3600000 |

The scale preserves the printed precision of TLE mean elements. Test code
extracts these integers from fixed TLE columns; it performs no calculation
needed by the executable. Users can provide the integers directly without Node.

Output is seven integers: **status, TEME x/y/z (m), TEME vx/vy/vz (mm/s)**.
Status 0 means success. Unsupported bounds, unreadable/missing tokens, a corrected
period of at least 225 minutes, or an epoch radius below the WGS-72 radius return
`1 0 0 0 0 0 0`. Status 1 is this kernel's single error code, not Vallado's
multi-code API. Low-perigee trajectories can be accepted when the epoch position
is above Earth; that says nothing about their later survival.

npiet uses C integer input: a numeric prefix may be accepted before trailing
junk. Extra tokens after the sixth are ignored. Supply integer tokens in the
documented range; oversized integer strings are outside the interpreter's input
contract. A seventh token does not request propagation to another time.

## Verification and numerical limits

`node sgp4/test.mjs` invokes unmodified npiet for every case; `npm test` runs this
after all existing suites. `node scripts/rebuild-check.mjs` verifies identical
executable pixels after rebuilding. The build does not import the reference
implementation or test fixtures. The Docker runtime can run with networking
disabled and the repository mounted read-only.

- **9 published epoch vectors:** satellite IDs 5, 6251, 22312, 28057, 28350,
  28872, 29141, 29238, and 88888 from `tcppver.out`.
- **52 valid cases total**, including seeded mean-element sweeps, zero/tiny
  eccentricity, equatorial/polar/retrograde geometry, and domain boundaries.
- **30 rejected cases:** unsupported bounds, deep-space mean motion, inside-Earth
  epoch positions, and every input position with EOF or an unreadable token.
- Acceptance thresholds fixed before implementation: **20 m and 20 mm/s per
  component**. Initial observed maxima: **2.952 m and 3.815 mm/s** across all
  valid cases. These are measured test errors, not a global accuracy guarantee.

See [machine-readable results](test-results.json). Published vectors are stored
independently of the executable; the pinned floating-point reference also has
to agree with them within 0.002 m / 0.002 mm/s before testing the PNG. The
upstream files' SHA-256 hashes are checked on each run.

Most arithmetic uses a scale of 1e8. Registers fit signed 32-bit because npiet's
`roll` implementation transports through an `int`; direct intermediate products
use its 64-bit stack arithmetic. Near-180-degree inclinations are excluded here
because the J3 longitude coefficient's small denominator needs finer precision.
The original tracker's smaller square-root domain is left unchanged; this
kernel supplies a root with room for Earth-radius-scaled semimajor axes.

The next stage requires wider precision for small drag/secular coefficients,
then nonzero-time comparisons against the pinned published verification rows.
Epoch agreement does not establish propagation accuracy.

## Reference provenance

Equations and verification cases originate from Vallado, Crawford, Hujsak and
Kelso, [Revisiting Spacetrack Report #3](https://celestrak.org/publications/AIAA/2006-6753/).
The fixture files and independent JavaScript port are preserved byte-for-byte
from [aholinch/sgp4 commit 552cb148](https://github.com/aholinch/sgp4/tree/552cb1489a52c3023ae70cb6c7e239e84c5950fe).
Their source paths and hashes are in
[provenance.json](../vendor/sgp4-reference/provenance.json), with the upstream
[Unlicense](../vendor/sgp4-reference/LICENSE). This reference JavaScript is test
infrastructure only; it never supplies results to the PNG.
