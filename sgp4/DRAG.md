# First drag-coefficient kernel

`drag.png` computes SGP4 cc2 and cc1=B*cc2 in executable Piet. It is a bounded
coefficient component, not nonzero-B* propagation. `secular.png` still rejects
nonzero B*.

Five integer inputs: recovered semimajor axis in metres (6600000–8000000),
eccentricity times 1e6 (0–20000), inclination in millidegrees (0–170000), recovered
mean motion in radians/minute times 1e10 (400000000–750000000), and B* times
1e9 (-1000000–1000000). Perigee must be at least 200 km above WGS-72 Earth.
These are recovered quantities, not raw TLE mean motion. Consistency between
the supplied axis and motion is the caller's responsibility.

Output: status, cc2 times 1e11, cc1 times 1e14. Invalid bounds or missing/unreadable
input return `1 0 0`. Use signed-32-bit integer tokens. npiet can accept numeric
prefixes and ignores extra tokens, as with the other executables.

```sh
printf '7000000\n0\n63000\n650000000\n1000\n' | npiet -q -cs 1 sgp4/drag.png
```

All mathematics runs in the PNG. Perigee bounds imply s=78 km. The expression
qoms24*tsi^4 is evaluated as ((120-s)/(a*R-R-s))^4, before dividing by psi^3.5,
to avoid prematurely rounding the small atmosphere coefficient. Integer sqrt
supplies sqrt(psi); the coefficient scale is 1e11. Registers fit signed 32-bit
and intermediate products use unmodified npiet's signed-64-bit arithmetic.

Independent floating test equations follow the pinned Vallado sgp4init block.
The unchanged acceptance limit is 5 output units plus 0.01% relative error.
99 valid and 21 invalid cases cover both B* signs, zero, orbital parameters,
range errors and every input-failure position. Results include the PNG hash.

Next: widen the domain, derive inputs inside the propagator, add the remaining
drag coefficients/time terms, and validate nonzero-B* state vectors. This
component alone does not establish atmospheric-drag propagation accuracy.
