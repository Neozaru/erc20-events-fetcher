
import _ from "lodash";



export function isETHAddress(input: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(input);
}

// 1000 Blocks per chunks - about 4 hours
const CHUNK_SIZE = 1000;

function chunkToBlockRange(chunkNumber: number): Range {
  const lowBlock = chunkNumber * CHUNK_SIZE;
  const highBlock = lowBlock + CHUNK_SIZE;
  return [highBlock, lowBlock];
}

export type Range = [number, number];

export function blockToChunk(blockNumber: number): number {
  return Math.floor(blockNumber / CHUNK_SIZE);
}

export function chunkRangeToBlockRange(chunkRange: Range): Range {
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
export function computeChunkRangesToFetch(chunkHigh: number, chunkLow: number, notToBeFetched: number[]): Range[] {
  const chunkRangesToFetch: Range[] = [];
  let lastUnfetched: number;
  let currentUnfetchedRange: number[] | Range = [];
  for (let i = chunkHigh; i >= chunkLow; i--) {
    if (!notToBeFetched.includes(i)) {
      lastUnfetched = i;
      if (currentUnfetchedRange.length === 0) {
        currentUnfetchedRange.push(i);
      }
    } else {
      if (currentUnfetchedRange.length === 1) {
        currentUnfetchedRange.push(lastUnfetched);
        chunkRangesToFetch.push(<Range>currentUnfetchedRange);
        currentUnfetchedRange = [];
      }
    }
  }
  if (currentUnfetchedRange.length === 1) {
    currentUnfetchedRange.push(lastUnfetched);
    chunkRangesToFetch.push(<Range>currentUnfetchedRange);
  }
  return chunkRangesToFetch;
}