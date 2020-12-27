// import { assert } from 'console';
// import { assert } from "console";
import assert from 'assert';
import { computeChunkRangesToFetch } from "../utils";

describe('Options tests', () => { // the tests container
  it('checking default options', () => { // the single test

    assert.deepStrictEqual([[0, 0]], computeChunkRangesToFetch(0, 0, []))
    assert.deepStrictEqual([[10, 0]], computeChunkRangesToFetch(10, 0, []))
    assert.deepStrictEqual([[30, 10]], computeChunkRangesToFetch(30, 10, []))

    assert.deepStrictEqual([], computeChunkRangesToFetch(0, 0, [0]))
    assert.deepStrictEqual([], computeChunkRangesToFetch(10, 0, [10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0]))
    // console.log('foo', computeChunkRangesToFetch(10, 0, [10, 9, 8, 7, 4, 3, 2, 1, 0]))
    assert.deepStrictEqual([[5, 5]], computeChunkRangesToFetch(10, 0, [10, 9, 8, 7, 6, 4, 3, 2, 1, 0]))
    assert.deepStrictEqual([[6, 5]], computeChunkRangesToFetch(10, 0, [10, 9, 8, 7, 4, 3, 2, 1, 0]))
    assert.deepStrictEqual([[10, 5],[2, 0]], computeChunkRangesToFetch(10, 0, [4, 3]))

    assert.deepStrictEqual([[9, 5], [3, 2], [0, 0]], computeChunkRangesToFetch(10, 0, [10, 4, 1]))

    // assert.deepStrictEqual([[30, 10]], computeChunkRangesToFetch(30, 10, []))
  });
});