
import React, { useEffect, useState } from 'react';
import { CHUNK_BATCH_SIZE } from '../config';
import { API_ENDPOINT } from '../config';
import EventLine from './EventLine';

interface IEventsHistory {
  chunkBatches: any[];
  lastFetchedChunk: number | undefined;
}

function callGetLatestChunk() {
  return fetch(`${API_ENDPOINT}/chunks/latest`, {
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
  })
  .then(res => res.json());
}

function callGetHistory(account: string, token: string, chunksRange: number[]) {
  return fetch(`${API_ENDPOINT}/accounts/${account}/tokens/${token}/events?chunkHigh=${chunksRange[0]}&chunkLow=${chunksRange[1]}`, {
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
  })
  .then(res => res.json());
}

const EventsHistory: React.SFC<any> = function({account, token}) {

  const [latestChunk, setLatestChunk] = useState();
  const [history, setHistory] = useState<IEventsHistory>({chunkBatches: [], lastFetchedChunk: undefined});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    callGetLatestChunk().then(res => setLatestChunk(res.latestChunk));
  }, []);

  // Start over when switching account or token
  useEffect(() => {
    setHistory({chunkBatches: [], lastFetchedChunk: undefined});
  }, [account, token]);

  function loadMoreEvents() {
    if (!latestChunk) {
      return;
    }
    // @ts-ignore
    const highChunk: number = Math.min(history.lastFetchedChunk ? history.lastFetchedChunk - 1 : latestChunk, latestChunk);
    const lowChunk: number = Math.max(highChunk - CHUNK_BATCH_SIZE, 0);
    const chunkRange = [highChunk, lowChunk];

    setIsLoading(true);
    callGetHistory(account, token, chunkRange).then(res => {
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
        {history.chunkBatches.map(chunkBatch => {
          return (
            <div>
            <div>Chunks {chunkBatch.chunkRange[0]} - {chunkBatch.chunkRange[1]}</div>
            {chunkBatch.chunkRangeEvents.map((event: any) => <EventLine event={event}/>)}
          </div>);
        })}
        {isLoading ? <img style={{height: '16px'}} alt="Loading chunks..." src="./loading.gif"/> : <></>}
      </div>
      {history.lastFetchedChunk ? <div>(Last fetched chunk : {history.lastFetchedChunk})</div> : <></>}
      {history.lastFetchedChunk !== 0 
        ? <button onClick={() => loadMoreEvents()} disabled={isLoading}>Fetch more</button>
        : <span>(all history fetched)</span>
      }
    </div>
  )
}

export default EventsHistory;