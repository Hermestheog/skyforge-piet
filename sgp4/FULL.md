# Integrated near-Earth SGP4

[`full.png`](full.png) is a verified, bounded near-Earth SGP4 Piet program. It
includes signed B* drag in addition to initialization, secular rates and periodic
corrections. All 636 acceptance cases pass in unmodified 64-bit npiet 1.3h.

All input-dependent orbital calculations execute as integer and stack operations
in the PNG. JavaScript assembles instructions and supplies independent test
references; it is not needed to run the PNG. This is fixed-point arithmetic,
with different scales chosen for geometry, rates and small drag terms.

From the repository root with unmodified 64-bit npiet 1.3h:

```sh
npiet -q -w -uu -cs 1 sgp4/full.png < examples/sgp4-6251-120min.txt
```

Or build the included Dockerfile and run:

```sh
docker build -t skyforge-piet .
docker run --rm -i --network none -v "$PWD:/work:ro" skyforge-piet -q -w -uu -cs 1 sgp4/full.png < examples/sgp4-6251-120min.txt
```

PowerShell:

```powershell
$pietDir = (Get-Location).Path
Get-Content examples/sgp4-6251-120min.txt | docker run --rm -i --network none --mount "type=bind,source=$pietDir,target=/work,readonly" skyforge-piet -q -w -uu -cs 1 sgp4/full.png
```

This published satellite-6251 example, at 120 minutes with original B*, returns:

```text
0 -3935697 409110 5471335 -3374784 -6635212 -1942056
```

Supply eight whitespace-separated signed-32-bit decimal integers:

| Input | Scale | Interface bounds |
|---|---|---|
| TLE mean motion | rev/day × 100000000 | 650000000–1700000000 |
| Eccentricity | × 10000000 | 0–2500000 |
| Inclination | degrees × 10000 | 0–1700000 |
| RAAN | degrees × 10000 | 0–3600000 |
| Argument of perigee | degrees × 10000 | 0–3600000 |
| Mean anomaly at epoch | degrees × 10000 | 0–3600000 |
| Time since epoch | seconds | -86400–86400 |
| B* | inverse Earth radii × 1000000000 | -1000000000–1000000000 |

Output is `status x y z vx vy vz`: TEME position in metres and velocity in mm/s.
The error packet is `1 0 0 0 0 0 0`; status 0 denotes a calculated state.
The interface bounds are not a guarantee that a trajectory remains valid.
Missing/unreadable inputs, unsupported bounds, deep-space periods, invalid
propagated elements and states below the WGS-72 Earth radius are rejected.
Numerical range guards also reject a normalized atmospheric ratio above 50000
or a coefficient/drag product outside the conservative signed-64-bit arithmetic
guards. The interface bounds are encoding limits, not a promise to propagate
every combination through an atmospheric singularity. Status 1 is this kernel's
single error code; it is not Vallado's multi-code API.

npiet uses C integer parsing, which may accept a numeric prefix before trailing
text. Supply integer tokens in range; oversized integers are outside its input
contract. Extra tokens are ignored.

The integration includes variable atmospheric parameters, normal and simplified
drag branches, cc1/cc3/cc4/cc5 effects, argument/mean-anomaly and node drag terms,
and higher-order time terms. Deep-space SDP4, TLE text parsing, UTC conversion
and observer/station geometry are separate work and are not provided here.
The layout is a dense executable raster; the original Earth/satellite artwork
and its 574-case behavior remain separate preserved artifacts.

`node sgp4/full-test.mjs` executes the actual PNG for 546 valid and 90 invalid
cases. The tolerance fixed before implementation is 100 m and 100 mm/s per
component. It retains the original 451 cases and adds 144 domain corners plus
15 exact failures from a broader signed-B* stress campaign, plus 15 polar-apogee
regressions, eight low-altitude numerical-range regressions and a circular
atmospheric-singularity regression plus two product-overflow regressions. It includes 104
direct published states with original B*, signed-B* grids, boundaries and seeded
cases. The pinned independent oracle is checked
against all 158 relevant published rows. Fractional-second rows are checked at
their original times in the oracle and separately recomputed at whole seconds
for the PNG interface. Neither rounding time nor changing B* is hidden in a
direct published comparison.

Failures and interpreter quirks are retained in
[the development log](../docs/DEVELOPMENT-LOG.md) and compressed evidence under
`logs/`. The [passing report](full-test-results.json) matches the executable's
SHA-256 `8ff515a97fd916105d7dd649bc60c0ab0f3c9f74d6d93a15bcf416678f7cc432`.
Maximum observed component errors are **76.092 m** and **53.484 mm/s**, below the
predeclared 100/100 limits. These are measured test results, not a formal accuracy
guarantee for every encodable input. Filtered diagnostics report partial coverage.

The image is 6094x1316 pixels and contains 259877 emitted instructions plus
routing. All eleven suites and reproducible-image checks passed in
[GitHub run 43756865368](https://github.com/Hermestheog/skyforge-piet/actions/runs/43756865368).
