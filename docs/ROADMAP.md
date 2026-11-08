# Road to SGP4

1. **Circular speed — implemented:** one input, integer sqrt, 574 checks,
   and an executable Earth/satellite illustration.
2. **Two-body tracker — implemented:** elliptic elements, time propagation,
   inertial position/velocity, rotating-Earth station geometry, range rate,
   Doppler and input-validation branches. See the executable PNG and tests.
3. **Tracking integration prerequisites:** independent published state-vector fixtures, a wider
   eccentricity/epoch test campaign, WGS-84 station geometry, UTC/Julian-date
   and sidereal-time conversion, and TLE parsing/checksums in Piet.
4. **SGP4 near-Earth — epoch and zero-drag milestones implemented:** WGS-72 initialization,
   generalized Kepler solving, J3 long-period and J2 short-period corrections
   in [an executable PNG](../sgp4/epoch.png), verified against nine published
   epoch vectors. Domain limits and instructions are in [sgp4/README.md](../sgp4/README.md).
   A second [executable PNG](../sgp4/secular.png) adds higher-precision secular
   rates and nonzero-time propagation for **B*=0**, up to ±86400 seconds;
   [instructions](../sgp4/PROPAGATION.md) state its limits. Next: atmospheric drag
   coefficients and higher-order time terms, then direct nonzero-time comparisons
   against original published TLE trajectories. Keep the
   two-body program as an independent baseline rather than silently renaming it.
5. **Deep-space support:** SDP4/resonance/lunar-solar terms, with separate
   verification coverage. A GEO example in the current two-body model does
   not establish deep-space SGP4 correctness.
6. **SkyForge integration:** feed input to the Piet executable and display its
   output in a host UI. Orbital computation stays in the PNG.

The v0.2.0 release contains the two-body baseline. This development branch adds
an SGP4 epoch kernel and a bounded B*=0 propagator. Nonzero B* and deep-space
support remain incomplete. Full acceptance requires
matching nonzero-time reference vectors, explicit numerical tolerances, and a
reproducible run in an unmodified interpreter. Image aesthetics never replace
numerical validation. TLE parsing, time conversion and station geometry remain
separate integration work; the epoch kernel accepts scaled mean elements.
