# Deep-space epoch foundation

Continuation authorized by the user's request to push existing work and keep
going along the SGP4 roadmap. Implementation choices remain delegated.

Deliver a separate executable Piet epoch kernel as the first deep-space
component. Inputs are integer days relative to JD 2451544.5 (2000-01-01 midnight)
in [-36525,36525], then milliseconds since midnight in [0,86399999]. Output:
status, Greenwich mean sidereal angle, lunar node phase, lunar orientation phase
(gam), solar mean phase (zmos), lunar mean phase (zmol), all radians times 1e8
normalized into [0,2*pi). Invalid input returns status 1 and five zeros.

Use the pinned Vallado gstime/dscom equations. Epoch interpretation follows the
Julian-day value supplied: no calendar parser, leap-second handling or UT1/UTC
conversion is implied. TLE-derived test epochs are explicitly quantized to
milliseconds before comparison. This component does not propagate deep-space
orbits or complete SDP4.

Approaches considered: integrating all deep-space terms at once makes failures
difficult to localize; returning sidereal time alone leaves the same epoch
arithmetic duplicated in dscom. A standalone time/phase kernel establishes a
reusable, independently tested boundary while preserving every v0.3.0 image.

Arithmetic uses exact sidereal-day reduction and high-precision phase reduction
before emitting 1e8-radian outputs. Avoid reducing a century of rotations using
the coarse output-scale approximation of 2*pi. All input-dependent calculations
execute in Piet; the host only assembles and independently verifies.

Acceptance fixed before implementation: each angle within 5e-8 radians using
circular distance; known J2000 noon GST anchor; millisecond/day/century bounds;
negative dates; all available TLE verification epochs; wrapping crossings; seeded
dates; malformed and missing input. Prior images remain byte-identical and all
prior suites continue passing.
