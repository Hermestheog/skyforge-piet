# Lunar orientation in Piet

The executable lunar.png computes the epoch-dependent orientation block from
Vallado dscom. It reuses the verified epoch emitter and performs sine, cosine,
square root and atan2 through Piet integer/stack instructions. This is a
component for deep-space initialization, not a full dscom or SDP4 propagator.

Provide two canonical signed-32-bit decimal tokens: days relative to JD2451544.5
(2000-01-01 midnight), inclusive [-36525,36525], then milliseconds since midnight,
inclusive [0,86399999]. Native npiet numeric-prefix parsing applies; oversized
integer tokens and arbitrary text are outside the contract. No UTC/UT1/calendar
conversion is performed. Missing/unreadable or parsed out-of-domain values
produce status 1 and six zeros.

Output: status zcosil zsinil zcoshl zsinhl zcosgl zsingl. Components are signed,
dimensionless, multiplied by 100000000. The pairs describe lunar inclination,
node orientation and perigee orientation as used internally by pinned dscom.

Run from repository root with unmodified 64-bit npiet:

~~~sh
npiet -q -w -uu -cs 1 sgp4/lunar.png < examples/lunar-j2000.txt
node sgp4/lunar-test.mjs
~~~

J2000 output:

~~~text
0 93423846 35664898 97857698 20588122 30315986 95293972
~~~

Using the Docker image built in README:

~~~sh
docker run --rm --network none -v "$PWD:/work" --entrypoint node skyforge-piet sgp4/lunar-test.mjs
~~~

Standalone validation passes 353 valid and 8 invalid cases,
including 33 quantized reference TLE epochs, date boundaries, node
quadrants and seeded dates. The independent test checks hashes of the reference
files, then exposes six local variables from an in-memory copy of pinned dscom;
it imports no production math and does not modify the vendored file.

Maximum observed component error: 6.165933641444354e-8 against the
predeclared 5e-7 absolute limit. Maximum unit-circle residual:
3.736037501589351e-8, below 2e-6. These are measured test bounds, not
an all-input accuracy proof. Image SHA-256:
c1d59915e3b6c2b3a46cd2c1029380a8e2a6b85fcdfd869142e084c72a754f86.

All build and sequential regression paths include this component. Independent
review found no critical or important defects. Full thirteen-suite CI acceptance
is pending. All prior PNGs remain
unchanged. Next: couple this orientation with mean orbital elements to compute
solar/lunar common coefficients, then periodic and resonance terms.
