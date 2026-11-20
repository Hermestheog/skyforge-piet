# Deep-space epoch foundation — checkpoint

`deep-time.png` executes epoch-angle arithmetic directly in standard Piet using
fixed-point integer stack operations. This component is not an SDP4 propagator.

Input: two whitespace-separated signed-32-bit decimal integer tokens: days relative to JD 2451544.5
(2000-01-01 midnight), inclusive range -36525 through 36525; then milliseconds
since midnight, inclusive range 0 through 86399999. This is a Julian-day/UT1
convention; calendar parsing, UTC/UT1 conversion and leap handling are absent.

Output: `status gsto xnodce gam zmos zmol`. Angles are radians multiplied by
100000000, normalized to [0, 2π). Missing/unreadable numeric input or parsed
values outside the stated ranges return `1 0 0 0 0 0`.

This uses npiet's native numeric input, not a strict text parser. Numeric prefixes
are accepted and extra tokens ignored. Out-of-int32 tokens are outside the
contract and may wrap: pinned npiet accepts `0 4294967296` as midnight,
`0 0bad` as midnight, and `0 1.5` as one millisecond. Supply canonical integer
tokens; the error packet does not validate arbitrary text. Four compatibility
probes document this behavior separately from the 256 numerical/error cases.

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

Build, rebuild, sequential `npm test` and CI artifact collection now include this
component (twelve suites total). Independent review found a test epoch rounding
issue and the input-contract ambiguity above; both are corrected. Full regression
acceptance is pending. Lunar/solar dynamics, resonance initialization and integration remain
future work. No new release tag is warranted by this checkpoint.
