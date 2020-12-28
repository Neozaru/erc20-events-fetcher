
ERC20 Events Fetcher

Functionnally, retrieves TRANSFER and APPROVAL events for a given account on a given token.
Technically, uses an Infura backend and stores results in a MongoDB database for subsequent requests, on a per-chunk (1000 blocks / 4 hours) basis.

