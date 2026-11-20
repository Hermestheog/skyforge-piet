# Road to SGP4

1. **Circular speed — implemented:** one input, integer sqrt, 574 checks,
   and an executable Earth/satellite illustration.
2. **Two-body tracker — implemented:** elliptic elements, time propagation,
   inertial position/velocity, rotating-Earth station geometry, range rate,
   Doppler and input-validation branches. See the executable PNG and tests.
3. **Tracking integration prerequisites:** independent published state-vector fixtures, a wider
   eccentricity/epoch test campaign, WGS-84 station geometry, UTC/Julian-date
   and sidereal-time conversion, and TLE parsing/checksums in Piet.
4. **Bounded SGP4 near-Earth — integrated signed-B* propagation implemented:** WGS-72 initialization,
   generalized Kepler solving, J3 long-period and J2 short-period corrections
   in [an executable PNG](../sgp4/epoch.png), verified against nine published
   epoch vectors. Domain limits and instructions are in [sgp4/README.md](../sgp4/README.md).
   A second [executable PNG](../sgp4/secular.png) adds higher-precision secular
   rates and nonzero-time propagation for **B*=0**, up to ±86400 seconds;
   [instructions](../sgp4/PROPAGATION.md) state its limits. The integrated
   [full PNG](../sgp4/full.png) adds variable atmosphere, signed B*, normal and
   simplified drag, and higher-order time terms. Its 636 cases include 104 direct
   original-B* published states; [instructions and numerical bounds](../sgp4/FULL.md)
   describe the accepted interface and range guards. Prior programs are preserved.
5. **Deep-space support — in progress:** a standalone epoch-angle PNG and
   256-case suite are saved in [the epoch foundation checkpoint](../sgp4/DEEP-TIME.md).
   Independent review and regression-runner integration remain pending.
   SDP4/resonance/lunar-solar dynamics remain unimplemented, with separate
   verification coverage. A GEO example in the current two-body model does
   not establish deep-space SGP4 correctness.
6. **SkyForge integration:** feed input to the Piet executable and display its
   output in a host UI. Orbital computation stays in the PNG.

The v0.2.0 release contains the two-body baseline. This development branch adds
an SGP4 epoch kernel, a bounded B*=0 propagator and verified integrated signed-B*
propagation. Deep-space propagation remains unimplemented. The integrated milestone
matches nonzero-time reference vectors at explicit tolerances and rebuilds
identically for an unmodified interpreter. TLE parsing, time conversion and
SGP4 station geometry remain separate integration work; the PNG accepts scaled
mean elements.
