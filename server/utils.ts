
import _ from "lodash";

// 1000 Blocks per chunks - about 4 hours
const CHUNK_SIZE = 1000;

export function blockToChunk(blockNumber: number) {
  return Math.floor(blockNumber / CHUNK_SIZE);
}

function chunkToBlockRange(chunkNumber: number): any {
  const lowBlock = chunkNumber * CHUNK_SIZE;
  const highBlock = lowBlock + CHUNK_SIZE;
  return [highBlock, lowBlock];
}

export function chunkRangeToBlockRange(chunkRange: number[]) {
  return [chunkToBlockRange(chunkRange[0])[0], chunkToBlockRange(chunkRange[1])[1]]
}

/**
 * 
 * @param chunkHigh Higest chunk to be fetched
 * @param chunkLow Lowest chunk to be fetched
 * @param notToBeFetched List of chunks not to be fetched
 * @returns An array of chunk ranges to be fetched.
 * @see utils.tests.ts
 */
export function computeChunkRangesToFetch(chunkHigh, chunkLow, notToBeFetched): number[][] {
  const chunkRangesToFetch = [];
  let lastUnfetched;
  let currentUnfetchedRange = [];
  for (let i = chunkHigh; i >= chunkLow; i--) {
    if (!notToBeFetched.includes(i)) {
      lastUnfetched = i;
      if (currentUnfetchedRange.length === 0) {
        currentUnfetchedRange.push(i);
      }
    } else {
      if (currentUnfetchedRange.length === 1) {
        currentUnfetchedRange.push(lastUnfetched);
        chunkRangesToFetch.push(currentUnfetchedRange);
        currentUnfetchedRange = [];
      }
    }
  }
  if (currentUnfetchedRange.length === 1) {
    currentUnfetchedRange.push(lastUnfetched);
    chunkRangesToFetch.push(currentUnfetchedRange);
  }
  return chunkRangesToFetch;
}