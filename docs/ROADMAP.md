# Road to SGP4

1. **Circular speed — implemented:** one input, integer sqrt, 574 checks,
   and an executable Earth/satellite illustration.
2. **Two-body tracker — implemented:** elliptic elements, time propagation,
   inertial position/velocity, rotating-Earth station geometry, range rate,
   Doppler and input-validation branches. See the executable PNG and tests.
3. **Before SGP4:** independent published state-vector fixtures, a wider
   eccentricity/epoch test campaign, WGS-84 station geometry, UTC/Julian-date
   and sidereal-time conversion, and TLE parsing/checksums in Piet.
4. **SGP4 near-Earth:** implement initialization, secular/periodic terms and
   drag; validate against published Vallado verification cases. Keep the
   two-body program as an independent baseline rather than silently renaming it.
5. **Deep-space support:** SDP4/resonance/lunar-solar terms, with separate
   verification coverage. A GEO example in the current two-body model does
   not establish deep-space SGP4 correctness.
6. **SkyForge integration:** feed input to the Piet executable and display its
   output in a host UI. Orbital computation stays in the PNG.

SGP4 is not implemented in the current release. Acceptance requires matching
reference vectors, explicit numerical tolerances, and a reproducible run in an
unmodified interpreter. Image aesthetics never replace numerical validation.
