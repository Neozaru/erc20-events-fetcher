
import _ from "lodash";

// export function computeChunkRangesToFetch(chunkHigh, chunkLow, alreadyFetched) {
//   console.log('computeChunkRangeToFetch', alreadyFetched);
//   const chunkRangesToFetch = [];
//   let lastUnfetched;
//   let currentUnfetchedRange = [];
//   for (let i = chunkHigh; i >= chunkLow; i--) {
//     // console.log(i, lastUnfetched, currentUnfetchedRange, lastUnfetched - i)
//     if (!alreadyFetched.includes(i)) {
//       console.log(i, 'not fetched')
//       if (currentUnfetchedRange.length === 0) { // Range begins
//         currentUnfetchedRange = [i];
//       } else {
//         if (_.isNumber(lastUnfetched) && lastUnfetched - i != 1) { // Range ends
//           currentUnfetchedRange.push(lastUnfetched);
//           chunkRangesToFetch.push(currentUnfetchedRange);
//           currentUnfetchedRange = [i];
//         }
//       }
//       lastUnfetched = i;
//     } else {
//       console.log(i, 'already fetched')
//     }
//   }
//   if (currentUnfetchedRange.length === 1 && _.isNumber(lastUnfetched)) {
//     currentUnfetchedRange.push(chunkLow);
//     chunkRangesToFetch.push(currentUnfetchedRange);
//   }
//   return chunkRangesToFetch;
// }

export function computeChunkRangesToFetch(chunkHigh, chunkLow, alreadyFetched) {
  // console.log('computeChunkRangeToFetch', alreadyFetched);
  const chunkRangesToFetch = [];
  let lastUnfetched;
  let currentUnfetchedRange = [];
  for (let i = chunkHigh; i >= chunkLow; i--) {
    // console.log(i, lastUnfetched, currentUnfetchedRange, lastUnfetched - i)
    if (!alreadyFetched.includes(i)) {
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
      // console.log(i, 'already fetched')
    }
  }
  if (currentUnfetchedRange.length === 1) {
    currentUnfetchedRange.push(lastUnfetched);
    chunkRangesToFetch.push(currentUnfetchedRange);
  }
  return chunkRangesToFetch;
}