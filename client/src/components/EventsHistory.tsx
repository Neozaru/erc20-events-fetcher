
import React, { useEffect, useState } from 'react';
import { CHUNK_BATCH_SIZE } from '../config';
import { API_ENDPOINT } from '../config';
import EventLine from './EventLine';

interface IEventsHistory {
  chunkBatches: any[];
  lastFetchedChunk: number | undefined;
}

function requestResponseHandler(res: any) {
  if (!res.ok) {
    return new Promise((resolve, reject) => {
      return res.json().then(reject)
    });
  }
  return res.json();
}

function callGetLatestChunk() {
  return fetch(`${API_ENDPOINT}/chunks/latest`, {
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
  })
  .then(requestResponseHandler);
}

function callGetHistory(account: string, token: string, chunksRange: number[]) {
  return fetch(`${API_ENDPOINT}/accounts/${account}/tokens/${token}/events?chunkHigh=${chunksRange[0]}&chunkLow=${chunksRange[1]}`, {
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
  })
  .then(requestResponseHandler);
}

const EventsHistory: React.SFC<any> = function({accountAddress, tokenInfo}) {

  const [latestChunk, setLatestChunk] = useState();
  const [history, setHistory] = useState<IEventsHistory>({chunkBatches: [], lastFetchedChunk: undefined});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState();

  useEffect(() => {
    callGetLatestChunk().then(res => setLatestChunk(res.latestChunk));
  }, []);

  // Start over when switching account or token
  useEffect(() => {
    setHistory({chunkBatches: [], lastFetchedChunk: undefined});
    setError(undefined);
  }, [accountAddress, tokenInfo]);

  function loadMoreEvents() {
    if (!latestChunk) {
      return;
    }
    // @ts-ignore
    const highChunk: number = Math.min(history.lastFetchedChunk ? history.lastFetchedChunk - 1 : latestChunk, latestChunk);
    const lowChunk: number = Math.max(highChunk - CHUNK_BATCH_SIZE, 0);
    const chunkRange = [highChunk, lowChunk];

    setIsLoading(true);
    setError(undefined);
    callGetHistory(accountAddress, tokenInfo.address, chunkRange)
    .then(res => {
      console.log('received events', res)

      const chunkRangeEvents = res.history.map((chunkEvents: any) => chunkEvents.events).flat();
      const chunkBatches: any[] = history.chunkBatches.concat([{
        chunkRange,
        chunkRangeEvents
      }]);
      console.log('chunkRangeEvents', chunkRangeEvents)
      setHistory({
        chunkBatches,
        lastFetchedChunk: lowChunk,
      });
    })
    .catch(({error}) => setError(error))
    .finally(() => setIsLoading(false));
  }

  if (!latestChunk) {
    return (<div>Loading...</div>);
  }

  return (
    <div>
      <div>Events history here</div>
      <div>Latest chunk : {latestChunk}</div>

      <div>
        {history.chunkBatches.map((chunkBatch, index) => {
          return (
            <div key={index}>
              <div style={{marginTop: '1em'}}><b>[Chunks {chunkBatch.chunkRange[0]} - {chunkBatch.chunkRange[1]}]</b> (until block {chunkBatch.chunkRange[1] * 1000})</div>
            {chunkBatch.chunkRangeEvents.map((event: any) => <EventLine event={event} tokenInfo={tokenInfo}/>)}
          </div>);
        })}
        {isLoading ? <img style={{height: '16px'}} alt="Loading chunks..." src="./loading.gif"/> : <></>}
      </div>
      <div>
      {history.lastFetchedChunk ? <div>(Last fetched chunk : {history.lastFetchedChunk})</div> : <></>}
      {history.lastFetchedChunk !== 0 
        ? <button onClick={() => loadMoreEvents()} disabled={isLoading}>Fetch more</button>
        : <span>(all history fetched)</span>
      }
      </div>
      {error
      ? <div style={{color: 'red'}}>{error}</div>
      : <></>}
    </div>
  )
}

export default EventsHistory;