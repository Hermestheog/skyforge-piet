# Lunar orientation foundation

Implement the epoch-dependent lunar orientation block of pinned Vallado dscom
as a separate executable Piet PNG, reusing epochAngles and the existing integer
trigonometric/square-root emitters. Full dscom at once would mix orientation,
orbital-element coupling and small coefficients; separating orientation makes
numerical failures local while preserving all ten prior executable images.
This implementation choice follows the user's delegated continued development.

Input: the same canonical signed-32-bit days/milliseconds as deep-time, days
[-36525,36525], milliseconds [0,86399999], relative to JD2451544.5 midnight.
Native npiet numeric prefix behavior applies; no strict token parser.
Output: status zcosil zsinil zcoshl zsinhl zcosgl zsingl, dimensionless times 1e8.
Error: 1 and six zeros. All runtime computations occur in standard Piet.
No calendar conversion, orbital propagation or full dscom is implied.

Predeclared acceptance: each component within 5e-7 absolute of pinned dscom
local variables, with unit-circle residual at most 2e-6. Cover century bounds,
midnight/noon transitions, seeded dates, node quadrant crossings and all pinned
TLE epochs quantized without collapsing Julian-date halves. Oracle must not
import production emitters. Tests may expose local variables in a test-only
instrumented copy of the hash-verified vendor function; vendor bytes stay intact.

Preserve failures, review numerical ranges and test independence, integrate all
build/test/CI paths, run complete regression and commit verified evidence.
