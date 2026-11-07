# SkyForge Piet tracking pipeline implementation plan

**Goal:** Publish a standalone, tested Piet orbital tracking repository before attempting SGP4.

**Architecture:** Preserve the circular-speed artwork and its tests. Add an independent
executable PNG implementing bounded elliptic two-body propagation, Earth rotation,
spherical-station ENU geometry, range rate, and Doppler. A JavaScript assembler emits
only Piet operations; an unmodified 64-bit npiet executes all runtime mathematics.

**Spec:** The user-approved next milestone is orbital elements + time + station →
position, azimuth, elevation, range, Doppler. SGP4 remains a later milestone.

## Constraints and implementation choices

- New repository: Hermestheog/skyforge-piet. Keep existing SkyForge changes untouched.
- Preserve old PNGs, test.mjs and all 574 regression cases byte-for-byte.
- New model: Earth mu=398600 km^3/s^2, spherical radius 6378137 m,
  rotation 0.00007292115 rad/s; sidereal angle at epoch supplied explicitly.
- Inputs: a km; e ppm; inclination, RAAN, argument of periapsis, M0 in millidegrees;
  elapsed seconds; epoch Earth angle, station latitude/longitude in millidegrees;
  station altitude m; carrier frequency kHz (npiet reads signed 32-bit inputs).
- Bounds: a 6478..50000 km; e 0..500000 ppm; perigee >=6478 km;
  time +/-86400 s; inclination 0..180 degrees; other orbital angles 0..360;
  latitude +/-90, longitude +/-180; altitude 0..10000 m; carrier 0..10 GHz.
- Q=10^8 trig/fractions, signed 64-bit stack, integer square roots, 8 Kepler
  Newton iterations, 12 sine-series terms and CORDIC atan2. No external runtime math.
- Output 13 integers: status (0 valid, 1 invalid), ECI x/y/z m, ECI vx/vy/vz mm/s,
  azimuth/elevation millidegrees, range m, range rate mm/s, Doppler Hz, visibility.
  Invalid inputs produce status=1 and twelve zero fields. Azimuth=-1 near zenith/nadir.
- Initial numerical acceptance: position/range <=100 m, velocity/range rate <=100 mm/s,
  angles <=0.05 degree away from the zenith singularity; Doppler error <=4 Hz at 10GHz.

## Tasks

- [x] Freeze the existing artifact in a standalone repository and record its hashes.
- [x] Write failing PNG-level tracking tests with analytic special cases and an independent
  floating-point two-body oracle; include eccentric, polar, GEO, negative time, input bounds.
- [x] Build a reusable stack-expression assembler and compact PNG renderer; implement
  fixed-point trig, square root, Kepler solution, frame rotations and tracking in Piet.
- [x] Run unmodified npiet on all new cases; fix failures and audit 64-bit bounds.
- [x] Rerun the original 574 tests and original/artwork equivalence sequentially.
- [x] Add README, math contract, examples, CI and SGP4 roadmap; independent final review.
- [x] Commit and publish the approved standalone repository; verify remote contents/CI.

## Review focus

Test nonzero eccentricity and multiple revolutions; both signs of time and range rate;
frame-rotation signs; polar and zenith/nadir geometry; every input bound and missing input.

## Progress

- Repository initialized on codex/tracking-pipeline, old artifacts copied unchanged.
- GitHub authentication verified; target repository does not yet exist.
- Ruling: implement inline in this session; this is one tightly coupled numerical pipeline.
- Ruling: no worktree of SkyForge needed: user requested an independent new repository.
- Final review: no substantive findings after clarifying npiet's integer-prefix input parsing.
- Implementation and sampled errors are documented in DEVELOPMENT-LOG.md; 80 tracker cases pass.
- Published public repository on 2026-11-07. CI run 42383657340 passed all stages;
  its logs and a full passing eccentric trace are preserved under logs/.
