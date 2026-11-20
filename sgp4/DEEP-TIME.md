# Deep-space epoch foundation — checkpoint

`deep-time.png` executes epoch-angle arithmetic directly in standard Piet using
fixed-point integer stack operations. This component is not an SDP4 propagator.

Input: two whitespace-separated integers: days relative to JD 2451544.5
(2000-01-01 midnight), inclusive range -36525 through 36525; then milliseconds
since midnight, inclusive range 0 through 86399999. This is a Julian-day/UT1
convention; calendar parsing, UTC/UT1 conversion and leap handling are absent.

Output: `status gsto xnodce gam zmos zmol`. Angles are radians multiplied by
100000000, normalized to [0, 2π). Invalid input returns `1 0 0 0 0 0`.

From the repository root with unmodified 64-bit npiet installed:

```sh
printf '0 43200000\n' | npiet -q -w -uu -cs 1 sgp4/deep-time.png
node sgp4/deep-time-test.mjs
```

Or build the README's Docker image and run the standalone suite:

```sh
docker run --rm --network none -v "$PWD:/work" --entrypoint node skyforge-piet sgp4/deep-time-test.mjs
```

The saved report contains 248 valid and 8 invalid cases, including 33 reference
TLE epochs quantized to milliseconds before comparison. Maximum measured angular
error is 2.561e-8 radians against a fixed 5e-8 limit. This validates epoch phases,
not published deep-space position vectors or all possible inputs.

PNG SHA-256: `9a2da0aa693c0884d5636ba9cd3e6500b9d6bfc5901ed33e2ac67b905cb66e6c`.
The image contains 3647 emitted instructions, 1174×235 pixels.

Pending: independent review, build/rebuild/test/CI integration and full regression
acceptance for this addition. Existing `npm test` still runs the eleven prior
suites. Lunar/solar dynamics, resonance initialization and integration remain
future work. No new release tag is warranted by this checkpoint.
