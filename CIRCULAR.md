# SkyForge orbital calculation in Piet

**`skyforge-orbit.png` is the executable source.** It is a 944 × 730 RGB PNG
whose executable blocks form Earth, an orbital ring, and a satellite. It uses
one pixel per codel. It reads an integer orbital
radius in kilometres from standard input and prints circular-orbit speed in
whole metres per second, rounded down, followed by a newline.

The radius is measured **from Earth's centre**, not above Earth's surface.
Accepted range: **6378–100000 km inclusive**. An out-of-range signed 32-bit
integer prints `-1`. Supply exactly one integer; decimal fractions and malformed
tokens are outside the input contract.

This implements the simplified, spherical-Earth, two-body circular-orbit model:

```
v = sqrt(mu / r)
mu = 398600 km^3/s^2
output = floor(1000 * sqrt(398600 / r))  [m/s]
```

It is a starting orbital calculation for SkyForge, not the application's SGP4
propagator. It does not model eccentricity, oblateness, atmosphere, or tracking
coordinates. The lower radius bound is a numerical limit, not a viable orbit
through Earth's atmosphere.

## Run the actual PNG

With a PNG-enabled [npiet](https://www.bertnase.de/npiet/) installed:

```sh
printf '42164\n' | npiet -q -cs 1 skyforge-orbit.png
# 3074
```

PowerShell, using the included Dockerfile (run from this directory):

```powershell
docker build -t skyforge-piet:npiet-1.3h .
$pietDir = (Get-Location).Path
'42164' | docker run --rm -i --network none --read-only --mount "type=bind,source=$pietDir,target=/work,readonly" skyforge-piet:npiet-1.3h -q -cs 1 skyforge-orbit.png
# 3074
```

The Docker image builds **unmodified upstream npiet v1.3h** with PNG support.
Its entry point is `npiet`, not a wrapper that evaluates orbital formulas.
Node is available in the image solely for assembling and testing; it is not
invoked by the command above. Only the PNG and a generic Piet interpreter are
needed to run the program. No precomputed answer table is embedded.

`skyforge-orbit-zoom.png` is an exact nearest-neighbour 6× enlargement and is
also executable; use `-cs 6`. Do not rescale with smoothing or save as JPEG.

## How the image computes

1. Piet `in(number)` reads the radius. Comparisons compute a validity flag.
   Invalid radii are temporarily replaced by 6378 to avoid division by zero;
   the final output is changed to `-1` using the flag.
2. Piet arithmetic computes the integer squared speed without overflowing a
   signed 32-bit stack:

   ```
   q = 398600000 div r
   rem = 398600000 mod r
   N = q*1000 + (rem*1000 div r)
     = floor(398600000000/r)
   ```

3. Starting with `a=0`, thirteen unrolled Piet instruction sequences try bits
   4096, 2048, …, 1. Each performs:

   ```
   a = a + b * NOT((a+b)*(a+b) > N)
   ```

   This produces `floor(sqrt(N))`. The result is below 8192 throughout the
   supported range, so thirteen bits suffice. `floor(sqrt(floor(x)))` equals
   `floor(sqrt(x))`; the squared-speed division does not add rounding error
   to the integer-speed result.
4. Piet `out(number)` prints the result; `out(char)` prints newline. A pointer
   turn enters the middle of the top edge of a 3×3 terminal block through
   white. Its eight extremal exits are blocked, so execution halts normally.

## The artwork is the program

The 597 original arithmetic and I/O instructions execute once, in their original
order, distributed through **401 globe blocks, 148 orbital-ring blocks, and 48
satellite blocks**. The original strip is retained only as a separate regression
fixture in `baseline/`; it is not embedded in the redesigned image.

Execution snakes through successive bands of the illustration. Each instruction
has a small source block and a larger colored destination. The destination is
chosen for its visible role (blue ocean, green continent, cyan orbit, yellow
satellite body or blue solar panel); the source color is calculated from the
required Piet color transition. Source areas still encode the exact constants.
White connectors reset the color without performing an operation. They are
visible as the fine horizontal lines in the artwork.

There are 660 illustrated instruction tiles: 597 original instructions and 63
stack-neutral padding instructions. Another 138 instructions implement turns
using `push 1/3; pointer`. The old strip's final two routing instructions are
replaced by these layout-specific turns and a blocked terminal block. The
computational algorithm and `orbit.pasm` are unchanged.

Every colored component belongs to the executed path. `verify-layout.mjs`
checks this against the actual npiet trace, flood-filling each touched color
block. It also verifies push areas and the complete original instruction order.
There is no unexecuted background painting or hidden executable strip.

Color transitions follow the
[Piet specification](https://www.dangermouse.net/esoteric/piet.html).
`instruction-map.json` records operation coordinates, source lines, and artwork
regions. `geo-trace.txt` records the real interpreter's stack trace for 42164.

## Tests and reproducibility

Run the test suite with native npiet on PATH:

```sh
node test.mjs
```

Or in the built Docker image, from PowerShell:

```powershell
$pietDir = (Get-Location).Path
docker run --rm --network none --mount "type=bind,source=$pietDir,target=/work" --entrypoint node skyforge-piet:npiet-1.3h test.mjs
```

Every numerical test launches the real npiet executable on the PNG. The test
oracle alone uses JavaScript floating-point square root. It does not supply
answers to the Piet program. Tests include named orbital cases, a radius sweep,
integer-square-root boundaries, invalid inputs, and the enlarged executable.
Every execution must exit normally within five seconds, with no interpreter
warnings. No artificial step limit is used to disguise nontermination.

The suite writes `test-results.json` and `geo-trace.txt`. See `TEST-RESULTS.md`
for the recorded results and reference values.

The original `test.mjs` is unchanged. A second suite executes both the original
and redesigned PNGs for all 574 cases and compares stdout byte for byte,
including the six enlarged-image cases. Run it with the same interpreter:

```powershell
docker run --rm --network none --mount "type=bind,source=$pietDir,target=/work" --entrypoint node skyforge-piet:npiet-1.3h equivalence.mjs
node verify-layout.mjs
```

The equivalence suite allows ten seconds per execution, requires exit 0 and no
warnings, and writes `equivalence-results.json`. The unchanged original suite
retains its five-second timeout. The pixel/trace audit writes
`layout-verification.json`. Run it after `test.mjs` has written the GEO trace.
Run the two interpreter suites sequentially: the 6× image has 5664 × 4380
pixels, and concurrent verification can cause the original five-second timeout
to expire. The tests and timeout have not been relaxed.

To reassemble the same pixels from the auditable stack recipe:

```sh
node assemble.mjs
```

`orbit.pasm` contains the stack algorithm. The assembler expands constants,
stack-copy macros, and fixed bit-trial sequences into Piet commands, then
encodes their colors as PNG. `earth-layout.mjs` arranges the operations into the
illustration and emits standard Piet routing instructions. Neither assembler
reads an orbital radius or calculates an orbital answer. The PNG is directly
executable without any of these source files.

## References and interpreter provenance

- [Bryan Weber, Circular Orbits, equations 121 and 127](https://orbital-mechanics.space/the-orbit-equation/circular-orbits.html): circular-speed formula and published GEO speed of approximately 3.075 km/s.
- [NASA/JPL Astrodynamic Parameters](https://ssd.jpl.nasa.gov/astro_par.html): Earth GM = 398600.435507 km³/s² (DE440). This program deliberately rounds GM to 398600. Tests also compare against the JPL value; the model change contributes less than 0.0044 m/s in the supported range.
- [David Morgan-Mar, Piet specification](https://www.dangermouse.net/esoteric/piet.html): colors, stack commands, DP/CC, and termination.
- [npiet source](https://www.bertnase.de/npiet/npiet-1.3h.c), retrieved 2026-11-06. SHA-256: `ffbd0de67691f8500418ae19aaeff5e05990689ed69617b644a1ce89e51d4e57`.

The upstream interpreter is GPL-2.0; its unmodified source and license are in
`vendor/`. The obsolete Windows 1.3a binary failed to launch on this host, so
validation uses the current Linux 1.3h build in Docker.
