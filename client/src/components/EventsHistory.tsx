
import React, { useEffect, useState } from 'react';
import { CHUNK_BATCH_SIZE } from '../config';
import { API_ENDPOINT } from '../config';
import EventLine from './EventLine';

interface IEventsHistory {
  chunkBatches: any[];
  lastFetchedChunk: number | undefined;
}

function callGetCurrentChunk() {
  return fetch(`${API_ENDPOINT}/chunks/current`, {
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

  const [currentChunk, setCurrentChunk] = useState();

  // const [events, setEvents] = useState([]);
  // const [lastFetchedChunk, setLastFetchedChunk] = useState();

  const [history, setHistory] = useState<IEventsHistory>({chunkBatches: [], lastFetchedChunk: undefined})

  useEffect(() => {
    callGetCurrentChunk().then(res => setCurrentChunk(res.currentChunk));
  }, []);

  function loadMoreEvents() {
    if (!currentChunk) {
      return;
    }
    // @ts-ignore
    const highChunk: number = Math.min(history.lastFetchedChunk ? history.lastFetchedChunk - 1 : currentChunk, currentChunk);
    const lowChunk: number = Math.max(highChunk - CHUNK_BATCH_SIZE, 0);
    const chunkRange = [highChunk, lowChunk];
    // if (!highChunk) {
    //   return;
    // }
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
    });
  }

  if (!currentChunk) {
    return (<div>Loading...</div>);
  }

  return (
    <div>
      <div>Events history here</div>
      <div>Current chunk : {currentChunk}</div>

      <div>
        {history.chunkBatches.map(chunkBatch => {
          return (
            <div>
            <div>Chunks {chunkBatch.chunkRange[0]} - {chunkBatch.chunkRange[1]}</div>
            {chunkBatch.chunkRangeEvents.map((event: any) => <EventLine event={event}/>)}
          </div>);
        })}
      </div>
      {history.lastFetchedChunk ? <div>(Last fetched chunk : {history.lastFetchedChunk})</div> : <></>}
      <button onClick={() => loadMoreEvents()} disabled={history.lastFetchedChunk === 0}>Fetch more</button>
    </div>
  )
}

export default EventsHistory;