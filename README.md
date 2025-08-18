# ADIF Sorrrter

## How to use
1. Open an ADIF file
2. Sorrrter will show you how much QSOs of each category there are and the header of the file.
3. Save the new file in a location of your liking!

## Sorting rules
- DE → Callsign alphabetical
- US → First according to the number in the callsign, afterwards callsign alphabetical
- remaining → Callsign alphabetical

## Some things you should know
- Header and each Record will remain exactly the same (this program will only change the sorting)
- Primary detection for DL/US using DXCC entities (DL=230, US=291). In case this fails, will use theprefix: DL `D[A-R]`, US `K|N|W|A[A-L]`.
- Calls will be normalized before sorting: For `EA/DL1ABC` or `DL1ABC/P` the part with a digit is prefered. If there is none, the first part is used.
