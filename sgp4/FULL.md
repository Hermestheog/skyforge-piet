# Integrated near-Earth SGP4

`full.png` is an executable Piet program under development. It includes signed
B* drag in addition to the initialization, secular rates and periodic corrections
of the earlier kernels. **The full validation suite is not yet passing.** Use
the retained baseline programs when you need their previously verified behavior.

All input-dependent orbital calculations execute as integer and stack operations
in the PNG. JavaScript assembles instructions and supplies independent test
references; it is not needed to run the PNG. This is fixed-point arithmetic,
with different scales chosen for geometry, rates and small drag terms.

From the repository root with unmodified 64-bit npiet 1.3h:

```sh
npiet -q -w -uu -cs 1 sgp4/full.png < elements.txt
```

Or build the included Dockerfile and run:

```sh
docker build -t skyforge-piet .
docker run --rm -i --network none -v "$PWD:/work:ro" skyforge-piet -q -w -uu -cs 1 sgp4/full.png < elements.txt
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
The intended error packet is `1 0 0 0 0 0 0`; status 0 denotes a calculated state.
The interface bounds are not a guarantee that a trajectory remains valid.
Missing/unreadable inputs, unsupported bounds, deep-space periods, invalid
propagated elements and states below the WGS-72 Earth radius must be rejected.
Numerical range guards also reject a normalized atmospheric ratio above 50000
or a coefficient/drag product outside the conservative signed-64-bit arithmetic
guards. The interface
bounds are encoding limits, not a promise to propagate every combination through
an atmospheric singularity. Error-path validation is part of the ongoing work.

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
`logs/`. A future passing report must match the SHA-256 of the executable image;
filtered diagnostic runs explicitly report partial coverage.
