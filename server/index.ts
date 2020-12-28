import express from "express";
import _ from "lodash";

import { fetchAllEvents, getCurrentChunk } from "./ethops";
import { blockToChunk, chunkRangeToBlockRange, computeChunkRangesToFetch } from "./utils";
import { fetchChunksFromDb, saveChunksToDb } from "./dbops";

// Ex: http://localhost:8000/apis/1/accounts/0x92A0b2C089733beF43Ac367D2CE7783526AEA590/tokens/0x6b175474e89094c44da98b954eedeac495271d0f/events?chunkHigh=11150&chunkLow=11100



// Chunks corresponding to the last 4000 blocks (4 * 1000) - about 24 hours - are not saved to DB.
const CHUNK_SAVE_AGE = 6;

const app = express();
const PORT = 8000;

// https://stackoverflow.com/a/10271632/1636977
// Not production-ready setup but OK for the exercice 
function enableCORSMiddleware (req, res, next) {
  res.setHeader('Access-Control-Allow-Origin', "*");
  res.setHeader('Access-Control-Allow-Headers', "*");
  res.setHeader('Access-Control-Allow-Methods', "*");
  
  next();
}
app.use(enableCORSMiddleware);
app.use(express.json());

app.get('/apis/1/chunks/current', async (req, res) => {
  const currentChunk: number = await getCurrentChunk();
  return res.send({currentChunk});
});

app.get('/apis/1/accounts/:accountAddress/tokens/:tokenAddress/events', async (req, res) => {
  const {accountAddress, tokenAddress} = req.params;
  if (!req.query.chunkHigh || !req.query.chunkLow) {
    return res.status(400).send({error: "chunkHigh and chunkLow must be specified"});
  }
  
  const currentChunk = await getCurrentChunk();

  // Highest chunk as requested by the user or corresponding to the latest block.
  const chunkHigh: number = Math.min(parseInt(<string>req.query.chunkHigh), currentChunk);
  const chunkLow: number = parseInt(<string>req.query.chunkLow);

  const dbHistory = await fetchChunksFromDb(accountAddress, tokenAddress, chunkHigh, chunkLow);
  console.log('recorded history', dbHistory.length);
  const chunksFetchedFromDb = _.map(dbHistory, 'chunk');

  // Fetching requested chunks, excluding those that were retrieved from DB (if any)
  const chunkRangesToFetch = computeChunkRangesToFetch(chunkHigh, chunkLow, chunksFetchedFromDb);
  console.log('Chunk Ranges to fetch', chunkRangesToFetch);

  // We won't save the most recent chunks blocks to avoid saving a chunk in which new transactions can still occur + hard fork risk.
  const chunksNotToSave = _.rangeRight(currentChunk, currentChunk - CHUNK_SAVE_AGE);

  const fetchs = _.map(chunkRangesToFetch, (chunkRange, index) => {
    const blockRange = chunkRangeToBlockRange(chunkRange);
    return fetchAllEvents(accountAddress, tokenAddress, blockRange[0], blockRange[1]).then(events => {
      console.log('Range', chunkRange[1], chunkRange[0])

      const fetchedChunks: number[] = _.range(chunkRange[1], chunkRange[0] + 1);

      // Creating an array of empty chunk history so fetched chunks are saved to DB
      const chunkEvents = _.map(fetchedChunks, (chunk) => {
        return {
          chunk,
          events: [],
        }
      })

      // Populating chunks that contain events
      _.each(events, (e) => {
        const chunk = blockToChunk(e.block);
        _.find(chunkEvents, {chunk}).events.push(e);
      });

      console.log('ChunkEvents', chunkEvents.length, _.filter(chunkEvents, ce => ce.events.length > 0).length);

      // Saving everything except the most recent chunks (if fetched)
      const chunksToSave = chunkEvents.filter(ce => !chunksNotToSave.includes(ce.chunk));
      saveChunksToDb(accountAddress, tokenAddress, chunksToSave);

      return chunkEvents;
    })
  });

  // Pre-sorting could be done when requesting the DB 
  return Promise.all(fetchs).then((fetchedHistory: any) => {
    const dbAndFetchedHistory = dbHistory.concat(fetchedHistory.flat());
    const eventsOnlyHistory = _.orderBy(dbAndFetchedHistory.filter(h => h.events.length > 0), 'chunk', 'desc');
    return res.status(200).send({history: eventsOnlyHistory});
  });

});


app.listen(PORT, () => {
  console.log(`⚡️[server]: Server is running at https://localhost:${PORT}`);
});

