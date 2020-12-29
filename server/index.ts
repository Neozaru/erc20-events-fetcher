import express, { Request, Response, NextFunction } from "express";
import _ from "lodash";

import { fetchAllEvents, getLatestChunk, getTokenInfo, FormattedEvent } from "./ethops";
import { blockToChunk, chunkRangeToBlockRange, computeChunkRangesToFetch, Range } from "./utils";
import { fetchChunksFromDb, saveChunksToDb, EventsChunk } from "./dbops";

// Ex: http://localhost:8000/apis/1/accounts/0x92A0b2C089733beF43Ac367D2CE7783526AEA590/tokens/0x6b175474e89094c44da98b954eedeac495271d0f/events?chunkHigh=11150&chunkLow=11100


// Chunks corresponding to the last 4000 blocks (4 * 1000) - about 24 hours - are not saved to DB.
const CHUNK_SAVE_AGE: number = 6;

const app = express();
const PORT: number = 8000;

// https://stackoverflow.com/a/10271632/1636977
// Not production-ready setup but OK for the exercice 
function enableCORSMiddleware (req: Request, res: Response, next: NextFunction) {
  res.setHeader('Access-Control-Allow-Origin', "*");
  res.setHeader('Access-Control-Allow-Headers', "*");
  res.setHeader('Access-Control-Allow-Methods', "*");
  
  next();
}

app.use(enableCORSMiddleware);
app.use(express.json());

app.get('/apis/1/chunks/latest', async (req: Request, res: Response) => {
  const latestChunk: number = await getLatestChunk();
  return res.send({latestChunk});
});

app.get('/apis/1/tokens/:tokenAddress', async (req: Request, res: Response) => {
  const {tokenAddress} = req.params;
  const tokenInfo = await getTokenInfo(tokenAddress);
  return res.send(tokenInfo);
});

app.get('/apis/1/accounts/:accountAddress/tokens/:tokenAddress/events', async (req: Request, res: Response) => {
  const {accountAddress, tokenAddress} = req.params;
  if (!req.query.chunkHigh || !req.query.chunkLow) {
    return res.status(400).send({error: "chunkHigh and chunkLow must be specified"});
  }
  
  const latestChunk: number = await getLatestChunk();

  // Highest chunk as requested by the user or corresponding to the latest block.
  const chunkHigh: number = Math.min(parseInt(<string>req.query.chunkHigh), latestChunk);
  const chunkLow: number = Math.max(parseInt(<string>req.query.chunkLow), 0);

  const dbHistory: EventsChunk[] = await fetchChunksFromDb(accountAddress, tokenAddress, chunkHigh, chunkLow);
  console.log('recorded history', dbHistory.length);
  const chunksFetchedFromDb: number[] = _.map(dbHistory, 'chunk');

  // Fetching requested chunks, excluding those that were retrieved from DB (if any)
  const chunkRangesToFetch: Range[] = computeChunkRangesToFetch(chunkHigh, chunkLow, chunksFetchedFromDb);
  console.log('Chunk Ranges to fetch', chunkRangesToFetch);

  // We won't save the most recent chunks blocks to avoid saving a chunk in which new transactions can still occur + hard fork risk.
  const chunksNotToSave: number[] = _.rangeRight(latestChunk, latestChunk - CHUNK_SAVE_AGE);

  const fetchs: Promise<EventsChunk[]>[] = _.map(chunkRangesToFetch, (chunkRange: [number, number]) => {
    const blockRange: Range = chunkRangeToBlockRange(chunkRange);
    return fetchAllEvents(accountAddress, tokenAddress, blockRange[0], blockRange[1]).then((events: FormattedEvent[]) => {
      console.log('Range', chunkRange[1], chunkRange[0])

      const fetchedChunks: number[] = _.range(chunkRange[1], chunkRange[0] + 1);

      // Creating an array of empty chunk history so fetched chunks are saved to DB
      const eventsChunks: EventsChunk[] = _.map(fetchedChunks, (chunk: number) => {
        return {
          chunk,
          events: [],
        }
      })

      // Populating chunks that contain events
      _.each(events, (e: FormattedEvent) => {
        const chunk = blockToChunk(e.block);
        _.find(eventsChunks, {chunk}).events.push(e);
      });

      console.log('ChunkEvents', eventsChunks.length, _.filter(eventsChunks, ec => ec.events.length > 0).length);

      // Saving everything except the most recent chunks (if fetched)
      const chunksToSave = eventsChunks.filter((ec: EventsChunk) => !chunksNotToSave.includes(ec.chunk));
      saveChunksToDb(accountAddress, tokenAddress, chunksToSave);

      return eventsChunks;
    })
  });

  // Pre-sorting could be done when requesting the DB 
  return Promise.all(fetchs).then((fetchedHistory: EventsChunk[][]) => {
    const dbAndFetchedHistory: EventsChunk[] = dbHistory.concat(_.flatten(fetchedHistory));
    const eventsOnlyHistory: EventsChunk[] = _.orderBy(dbAndFetchedHistory.filter(h => h.events.length > 0), 'chunk', 'desc');
    return res.status(200).send({history: eventsOnlyHistory});
  });

});


app.listen(PORT, () => {
  console.log(`⚡️[server]: Server is running at https://localhost:${PORT}`);
});

