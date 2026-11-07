# Auditable assembly recipe. The executable source is skyforge-orbit.png.
# Stack is written bottom -> top. const/pick/trybit are assembler macros.
# Default sentinel handles EOF; one decimal integer radius (km) is read in Piet.
const 0
in_number
# r -> r, valid; valid = (r > 6377) * (100001 > r)
duplicate
const 6377
greater
const 100001
pick 3
greater
multiply
# r,valid -> r,valid,safeR; safeR = r*valid + 6378*(1-valid)
duplicate
pick 3
multiply
pick 2
not
const 6378
multiply
add
# q = floor(398600000 / safeR), rem = 398600000 mod safeR
# N = q*1000 + floor(rem*1000/safeR) = floor(398600000000/safeR)
# This factorization avoids constructing a number larger than signed 32-bit.
const 398600000
pick 2
divide
const 1000
multiply
const 398600000
pick 3
mod
const 1000
multiply
pick 3
divide
add
# Stack: sentinel,r,valid,safeR,N
# Binary integer square root. trybit b: a += b * NOT((a+b)^2 > N)
# Each trial expands to ordinary Piet stack arithmetic and comparisons.
const 0
trybit 4096
trybit 2048
trybit 1024
trybit 512
trybit 256
trybit 128
trybit 64
trybit 32
trybit 16
trybit 8
trybit 4
trybit 2
trybit 1
# Stack: sentinel,r,valid,safeR,N,a. Invalid input returns -1.
pick 4
multiply
pick 4
not
subtract
out_number
const 10
out_char
# Turn down into a white inlet and a terminal block with all eight exits blocked.
const 1
pointer
