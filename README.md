

Work in progress, very dirty.

Fetches TRANSFER and APPROVAL events for a given ETH account with a given token.
Records events in a database in order to avoid repeated on-chain reads.


Using docker
---
- Ensure that `docker` and `docker-compose` are installed.
- Ensure that port 3000 (web client), 8000 (server) and 27017 (mongodb) aren't already busy.
Run docker compose :
```
docker-compose up
```