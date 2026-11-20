# Eccentricity drag coefficients in Piet

`drag-ecc.png` extends the bounded coefficient calculation with SGP4 cc4 and cc5.
The previous `drag.png` executable and tests are preserved unchanged.

Inputs are the five recovered quantities documented in [DRAG.md](DRAG.md),
followed by argument of perigee in millidegrees (0–360000). The same semimajor
axis, eccentricity, inclination, mean-motion, B* and perigee bounds apply.

Outputs: status, cc2 times 1e11, cc1 times 1e14, cc4 times 1e11, cc5 times 1e10.
Invalid bounds or missing/unreadable input produce `1 0 0 0 0`. npiet's existing
numeric-prefix parsing behavior applies; extra input is ignored.

```sh
printf '7000000\n1000\n63000\n650000000\n1000\n45000\n' | npiet -q -cs 1 sgp4/drag-ecc.png
```

All runtime calculations, including cos(2*argument of perigee), execute in Piet.
The test oracle uses independent floating equations from the pinned Vallado
sgp4init block. Tests cover five periapsis angles, both B* signs and zero, and
all input-error branches. Tolerances remain 5 output units plus 0.01% relative
error, fixed before implementation. Results include the executable SHA-256.

This is coefficient initialization only. Connecting the coefficients to time
evolution, remaining drag terms, and verification against original nonzero-B*
state vectors is still required. The zero-drag propagator is unchanged.
