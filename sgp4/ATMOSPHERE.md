# SGP4 atmosphere initialization in Piet

`atmosphere.png` is a standalone executable component for the next drag milestone.
It does not yet add nonzero-B* propagation to `secular.png`.

Input: perigee altitude in whole metres, 0–2000000. Output: status,
simplified-drag flag, s4 times 1e8, qoms24 times 1e15. Missing/unreadable or
out-of-range input produces `1 0 0 0`. Use signed-32-bit integer tokens;
npiet's numeric-prefix parsing and ignored extra tokens apply as elsewhere.

Run directly with unmodified 64-bit npiet:

```sh
printf '127200\n' | npiet -q -cs 1 sgp4/atmosphere.png
```

The emitted Piet follows the pinned Vallado `sgp4init` atmosphere block:
below 98 km use s=20 km; from 98 to 156 km use s=perigee-78 km; otherwise
use s=78 km. Then s4=1+s/6378.135 and qoms24=((120-s)/6378.135)^4.
The simplified-drag flag is 1 strictly below 220 km.

All runtime calculations are integer stack operations. The fourth power uses
successive scaled squares to avoid 64-bit overflow. The independent floating
test equations are test-only. Predeclared limits are less than one output unit
for s4 and less than 100 output units (1e-13 absolute) for qoms24.
The 218 tests include exact thresholds, neighbouring metre inputs, a regular
altitude sweep and invalid input. See `atmosphere-test-results.json`.

The next integration step must derive perigee from the recovered SGP4 elements,
compute drag coefficients using these parameters, and apply the time terms.
This component alone does not establish atmospheric-drag propagation accuracy.
