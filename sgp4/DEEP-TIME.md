# Deep-space epoch foundation

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

The J2000 noon example, also saved in `examples/deep-time-j2000.txt`, returns:

```text
0 489496120 218238244 145496891 624026290 235528008
```

The pinned reference GST is 4.894961212823059 radians; the PNG returns
4.89496120 radians. All five phase comparisons appear in the saved report.

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

Arithmetic range notes: centered milliseconds have magnitude at most 43200000.
The largest lunar phase product is `22802713200 * 43200000`, below 9.86e17;
the whole-day GST drift product is at most `36525 * 8640184812866`, below
3.16e17. Both fit signed 64-bit arithmetic. GST is reduced in microseconds before
angle conversion; whole seconds and residual microseconds are multiplied
separately to avoid overflow. Lunar phases are reduced at 1e11 precision before
conversion to the 1e8 output scale. Wide intermediate registers use split limbs
to avoid npiet's int-sized roll temporary. This range reasoning is not a formal
proof of the numerical error bound over every encodable input.

Build, rebuild, sequential `npm test` and CI artifact collection now include this
component (twelve suites total). Independent review found a test epoch rounding
issue and the input-contract ambiguity above; both are corrected. Full regression
acceptance passed in [CI run 44834509587](https://github.com/Hermestheog/skyforge-piet/actions/runs/44834509587) for source `f37d138`. Lunar/solar dynamics, resonance initialization and integration remain
future work. No new release tag is warranted by this checkpoint.
