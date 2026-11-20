# Lunar Orientation Implementation Plan

> Execute inline with executing-plans; request one independent final review.

Goal: executable Piet lunar orientation needed by deep-space dscom.
Architecture: separate emitter, PNG builder, independent pinned-oracle suite.
Spec: ../specs/2026-11-20-lunar-orientation-design.md

- [x] Write independent tests; preserve missing-image red failure.
- [x] Emit epoch-dependent orientation using existing trig, sqrt and atan2;
  build executable PNG and audit artifacts, then pass actual npiet tests.
- [x] Review ranges and independent oracle; address concrete findings.
- [x] Integrate build/rebuild/sequential tests/CI and document contract/results.
- [ ] Verify all previous tests and images, preserve logs, commit and push.

Review focus: 64-bit products, 32-bit stored registers/roll temporary, CORDIC
range and quadrants, sqrt range, negative components, noon epoch convention,
quantization and oracle instrumentation integrity.
