# Tracking model and numerical contract

This release implements a bounded two-body elliptic model. It is not SGP4,
does not accept TLEs, and does not yet convert UTC dates to sidereal angles.
The caller supplies the epoch's Earth angle in the chosen inertial frame.
Earth is spherical (R=6378137 m); mu=398600 km³/s² and omega=0.00007292115 rad/s.

## Equations

Mean motion is `n=sqrt(mu/a^3)` and mean anomaly is `M=M0+n*t`. Eight Newton
iterations solve `E-e*sin(E)=M`, with e restricted to 0..0.5. The program computes
perifocal state from E, rotates by argument of periapsis/inclination/RAAN into
ECI, then rotates by the time-dependent Earth angle into Earth-fixed coordinates.
Velocity includes the derivative of Earth rotation; omitting it would corrupt
range rate and Doppler.

Station-to-satellite displacement is projected onto East/North/Up. Range is its
norm, azimuth is atan2(E,N), elevation is atan2(U,sqrt(E²+N²)), and range rate is
the displacement/relative-velocity dot product divided by range. Doppler is
`-rangeRate * carrier / c`, with c=299792458 m/s. Visibility uses U>=0.
Azimuth is reported as -1 when the integer horizontal displacement is <=1 m.

Sources:

- [Kepler's equation for elliptic orbits](https://orbital-mechanics.space/time-since-periapsis-and-keplers-equation/elliptical-orbits.html).
- [Orbital elements and state vectors](https://orbital-mechanics.space/classical-orbital-elements/orbital-elements-and-the-state-vector.html).
- [ESA Navipedia ECEF/ENU transformations](https://gssc.esa.int/navipedia/index.php/Transformations_between_ECEF_and_ENU_coordinates).

## Fixed point and interpreter compatibility

All execution is Piet integer arithmetic. Trig and eccentricity use scale 10^8.
Sine folds its argument into [-pi/2,pi/2], evaluates twelve Taylor terms, and
clamps to [-1,1]. Cosine uses a quarter-turn offset. Integer square root tests
27 bits. Atan2 uses 28 CORDIC steps with fixed angle constants.

Mean motion uses an integer square root of `6377600000000000000/a`, producing
speed scaled by 4 million in km/s, then multiplies by 250000 and divides by a
to obtain radians/s scaled by 10^12. This avoids constructing mu*10^24.

The validated interpreter is **unmodified npiet 1.3h compiled for 64-bit Linux**.
Its stack is `long`, but numeric input and the temporary transported by `roll`
are `int`. Consequently:

- Inputs are 32-bit, with carrier in kHz.
- Stored registers remain signed 32-bit; CORDIC vectors are scaled by 8.
- Wide radicands are recomputed as expressions, not stored and moved by roll.
- Temporary products use signed 64-bit. Existing wide temporaries are shifted
  through long stack slots; only narrow register copies are transported by roll.
- A 9e18 sentinel detects EOF/failed integer conversion. It is compared directly, then
  either discarded or followed by a genuine pointer branch to error output.
- Windows builds where `long` is 32-bit are not supported for this tracker.

At the documented bounds, radius is at most 75,000 km and station radius at
most 6,388,137 m. Position/displacement are below 82 million metres, so squared
norms fit 64-bit. CORDIC's gain times 8 times that norm stays below 2^31.
Trig intermediates, mean-motion/time products and Doppler products fit 64-bit.
The largest explicit constant is 6.3776e18; the sentinel is 9e18, both below
2^63. A read operand's maximum signed-32-bit magnitude cannot push the sentinel
comparison past 2^63. Angles and output fields fit signed 32-bit.

## Validation scope

The test oracle is independently written floating-point mathematics. Analytic
equatorial/polar cases pin coordinates and range, while eccentricity, arbitrary
rotations, GEO-like motion, positive/negative time, station hemispheres, both
Doppler signs, and input bounds are exercised separately.

Acceptance limits are 100 m per ECI coordinate and range, 100 mm/s per velocity
component and range rate, 0.05° per angle, and 4 Hz Doppler. These are test
thresholds, not a proof of worst-case accuracy over every possible input.
Read `tracking/test-results.json` for actual observed errors. Near the zenith
azimuth is singular; near the horizon small rounding changes can affect the
visibility bit. The model excludes oblateness, drag, perturbations, precession,
nutation, light-time, refraction, and ellipsoidal/geodetic station geometry.

The earlier circular program, 574-case suite, and all artwork behavior remain
unchanged. New tracking tests are additional; they do not replace that evidence.
