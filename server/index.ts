import express from "express";
import mongodb from "mongodb";
import _ from "lodash";

import { BigNumber, ethers, providers } from "ethers";
import { computeChunkRangesToFetch } from "./utils";

const erc20abi = require("./abis/erc20.abi.json");
// http://localhost:8000/apis/1/accounts/0xf395f9669ab1EF677BEd6208696C71aa2DE39841/tokens/0xff795577d9ac8bd7d90ee22b6c1703490b6512fd/events


// 11,138
// Homestead 
// http://localhost:8000/apis/1/accounts/0x92A0b2C089733beF43Ac367D2CE7783526AEA590/tokens/0x6b175474e89094c44da98b954eedeac495271d0f/events
// 0x6b175474e89094c44da98b954eedeac495271d0f


// http://localhost:8000/apis/1/accounts/0x92A0b2C089733beF43Ac367D2CE7783526AEA590/tokens/0x6b175474e89094c44da98b954eedeac495271d0f/events?chunkHigh=11150&chunkLow=11100


const CHUNK_SIZE = 1000; // 1000 Blocks are about 4 hours


function blockToChunk(blockNumber: number) {
  return Math.floor(blockNumber / CHUNK_SIZE);
}

// function blockRangeToChunk(blockRange: number[]) {
//   return Math.floor(blockRange[1] / CHUNK_SIZE);
// }

function chunkToBlockRange(chunkNumber: number): any {
  const lowBlock = chunkNumber * CHUNK_SIZE;
  const highBlock = lowBlock + CHUNK_SIZE;
  return [highBlock, lowBlock];
}

function chunkRangeToBlockRange(chunkRange: number[]) {
  return [chunkToBlockRange(chunkRange[0])[0], chunkToBlockRange(chunkRange[1])[1]]
}

const provider = new providers.InfuraProvider("homestead", {
  projectId: '20bc7cc8b2b84693a8b014781778be8d',
  projectSecret: 'd7f31210a379430d8b3f7a866548907a',
});

const mongodbUrl = "mongodb://localhost:27017/erc20tx";
// mongodb.MongoClient.connect(mongodbUrl, function(err, db) {
//   if (err) {
//     console.error(err);
//   } else {
//     console.log('created', db);
//     const dbo = db.db('erc20tx');
//     const newUserTokenHistory = {
//       account: '0x92A0b2C089733beF43Ac367D2CE7783526AEA590',
//       token: '0x6b175474e89094c44da98b954eedeac495271d0f',
//       blockFrom: undefined,
//       blockTo: undefined,
//       transactions: [],
//     };

//     dbo.collection('userTokenHistory').insertOne(newUserTokenHistory, function(err, res) {
//       if (err) throw err;
//       console.log(res);
//       db.close();
//     });
//   }
// });

const MAX_ALLOWANCE = BigNumber.from(2).pow(256).sub(1);
const COLLECTION = 'userTokenHistory';


const mongoHistoryPushOp = (historyToAdd) => {
  return {
    history: {
      $each: historyToAdd,
      $sort: { block: -1 }
    }
  };
}

// function saveUserTokenHistory(account: string, token: string, history: any[], blockHigh: number, blockLow: number) {
//   return mongodb.MongoClient.connect(mongodbUrl).then(async (db) => {
//     // if (err) throw err;
//     // console.log('created', db);
//     const dbo = db.db('erc20tx');
//     const existingDoc = await dbo.collection(COLLECTION).findOne({account, token});
//     if (!existingDoc) {
//       const newDoc = {
//         account,
//         token,
//         blockHigh,
//         blockLow,
//         history,
//       };
//       await dbo.collection(COLLECTION).insertOne(newDoc);
//     } else {
//       console.log('EXISTING');
//       if (existingDoc.blockLow - 1 == blockHigh) { // Extending history to the past
//         console.log('Extending history to the past', history.length)
//         await dbo.collection(COLLECTION).updateOne({_id: existingDoc._id}, {
//           $set: {blockLow},
//           $push: mongoHistoryPushOp(history),
//           // upsert: true
//         });
//       } else if (existingDoc.blockHigh + 1 == blockLow) { // Refreshing history towards the present
//         console.log('Refreshing history towards the present')
//         await dbo.collection(COLLECTION).updateOne({_id: existingDoc._id}, {
//           $set: {blockHigh},
//           $push: mongoHistoryPushOp(history),
//           // upsert: true
//         });
//       } else {
//         throw new Error(`Input Block range does not fit with existing saved block range : Current : [${existingDoc.blockHigh}, ${existingDoc.blockLow}]. Incoming : [${blockHigh}, ${blockLow}]`);
//       }
//     }
//     db.close();

//     return history;
//   });
// }

function fetchChunksFromDb(account, token, chunkHigh, chunkLow) {

  return mongodb.MongoClient.connect(mongodbUrl).then(async (db) => {
    const dbo = db.db('erc20tx');
    const cursor = await dbo.collection(COLLECTION).aggregate([
      { "$match": {account, token}},
      { "$unwind": "$history" },
  
      { "$match": {"history.chunk": {$gte: chunkLow, $lte: chunkHigh}}}
      // {
      //   'history.chunk': {$gte: 11100, $lte: 11127}
      // }
    ]);


    return new Promise((resolve, reject) => {
      cursor.toArray((err, arr) => {
        db.close();
        if (err) {
          reject(err);
        } else {
          resolve(_.map(arr, 'history'));
        }
      });
    })
    // return existingDoc.history;
  });
}

function saveChunksToDb(account, token, chunksWithEvents) {
  return mongodb.MongoClient.connect(mongodbUrl).then(async (db) => {
    const dbo = db.db('erc20tx');
    const existingDoc = await dbo.collection(COLLECTION).findOne({account, token});
    if (!existingDoc) {
      console.log(`Creating fresh DB history for ${account}/${token}`)
      const newDoc = {
        account,
        token,
        history: chunksWithEvents,
      };
      await dbo.collection(COLLECTION).insertOne(newDoc);
    } else {
      console.log(`Adding chunks to DB history for ${account}/${token}`)
      await dbo.collection(COLLECTION).updateOne(
        {_id: existingDoc._id},
        {
          $push: {history: {$each: chunksWithEvents}}
        }
      );
    }
    db.close();
  });
}


function formatTransferLog(eventLog: any) {
  const iface = new ethers.utils.Interface(erc20abi);
  const dec = iface.parseLog(eventLog);
  // console.log(dec.args);
  return {
    type: 'TRANSFER',
    block: eventLog.blockNumber,
    params: {
      from: eventLog.args.from,
      to: eventLog.args.to,
      value: eventLog.args.value,
    }
  }
}

function formatApprovalLog(eventLog) {
  const iface = new ethers.utils.Interface(erc20abi);
  const dec = iface.parseLog(eventLog);
  return {
    type: 'APPROVAL',
    block: eventLog.blockNumber,
    params: {
      owner: eventLog.args.owner,
      spender: eventLog.args.spender,
      value: eventLog.args.value,
    }
  }

} 


function formatBN(bn, decimals: number) {
  if (MAX_ALLOWANCE.eq(bn)) {
    return 'INFINITE';
  } else {
    return ethers.utils.formatUnits(bn, decimals)
  }
}

function printTransfer(transfer: any, decimals: number) {
  console.log(`${transfer.block} - TRANSFER - ${transfer.params.from} -> ${transfer.params.to} : ${formatBN(transfer.params.value, decimals)}`);
}

function printApproval(approval: any, decimals: number) {
  console.log(`${approval.block} - APPROVAL - ${approval.params.owner} allowed ${approval.params.spender} to spend : ${formatBN(approval.params.value, decimals)}`);
}

function printEvent(event: any, decimals: number) {
  if (event.type === 'TRANSFER') {
    printTransfer(event, decimals);
  } else {
    printApproval(event, decimals);
  }
}


function fetchEvents(contract, filter, formatter, blockHigh: number, blockLow: number) {
  return contract.queryFilter(filter, blockLow, blockHigh).then((logs) => {

    console.log('Fetching events', blockHigh, blockLow);
    // console.log(logs);
    console.log(logs.length)

    return logs.map(formatter);
  });
}


async function fetchAllEvents(accountAddress, tokenAddress, blockHigh, blockLow) {

  const contract = new ethers.Contract(tokenAddress, erc20abi, provider);
  let filterFrom: any = contract.filters.Transfer(accountAddress);
  let filterTo: any = contract.filters.Transfer(null, accountAddress);
  let filterApprovals: any = contract.filters.Approval(accountAddress);

  const decimals = await contract.decimals();

  return Promise.all([
    fetchEvents(contract, filterFrom, formatTransferLog, blockHigh, blockLow),
    fetchEvents(contract, filterTo, formatTransferLog, blockHigh, blockLow),
    fetchEvents(contract, filterApprovals, formatApprovalLog, blockHigh, blockLow),
  ])
  .then(([trFrom, trTo, approvals]) => {
    return trFrom.concat(trTo).concat(approvals).sort((trA, trB) => trA.block == trB.block ? 0 : trA.block < trB.block ? 1 : -1);
  })
  .then((events) => {
    events.forEach(tr => printEvent(tr, decimals));
    console.log(events.length, 'events')
    // res.send(events);
    return events;
  });
}


// function fetchAndSaveEvents(accountAddress, tokenAddress, blockHigh, blockLow) {
//   return fetchAllEvents(accountAddress, tokenAddress, blockLow, blockHigh).then(events => {
//     console.log('Fetch All : ', events.length)
//     return saveUserTokenHistory(accountAddress, tokenAddress, events, <number>blockHigh, <number>blockLow);
//   });
// }

// async function fetchAndSaveBatch(accountAddress, tokenAddress, blockHigh, blockLow) {
//   let currentBlockHigh = blockHigh;
//   let currentBlockLow = Math.max(currentBlockHigh - MAX_CHUNK_SIZE + 1, blockLow);
//   while(currentBlockLow > blockLow) {
//     console.log('Fetch and save', currentBlockHigh, currentBlockLow)
//     await fetchAndSaveEvents(accountAddress, tokenAddress, currentBlockHigh, currentBlockLow);
//     console.log('Saved (?)')
//     currentBlockHigh = currentBlockHigh - MAX_CHUNK_SIZE;
//     currentBlockLow = Math.max(currentBlockHigh - MAX_CHUNK_SIZE + 1, blockLow);
//   }
// }



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

app.get('/', (req, res) => res.send('Express + TypeScript Server'));

app.get('/apis/1/chunks/current', async (req, res) => {
  const fetchedBlockNumber: any = await provider.getBlockNumber();
  const currentChunk: number = blockToChunk(fetchedBlockNumber);
  return res.send({currentChunk});
});

app.get('/apis/1/accounts/:accountAddress/tokens/:tokenAddress/events', async (req, res) => {
  // console.log(req);
  const {accountAddress, tokenAddress} = req.params;
  if (!req.query.chunkHigh || !req.query.chunkLow) {
    return res.status(400).send({error: "chunkHigh and chunkLow must be specified"});
  }
  
  // const {chunkHigh, chunkLow} = req.query;
  const chunkHigh: number = parseInt(<string>req.query.chunkHigh);
  const chunkLow: number = parseInt(<string>req.query.chunkLow);

  const dbHistory = await fetchChunksFromDb(accountAddress, tokenAddress, chunkHigh, chunkLow);
  console.log('recorded history', dbHistory.length);
  const chunkRangesToFetch = computeChunkRangesToFetch(chunkHigh, chunkLow, _.map(dbHistory, 'chunk'));
  console.log('Chunk Ranges to fetch', chunkRangesToFetch);

  const blockRangesToFetch = _.map(chunkRangesToFetch, chunkRangeToBlockRange);
  console.log('Block Ranges to fetch', blockRangesToFetch);
  
  // let fetchedChunks = [];
  const fetchs = _.map(blockRangesToFetch, (blockRange, index) => {
    return fetchAllEvents(accountAddress, tokenAddress, blockRange[0], blockRange[1]).then(events => {
      console.log('Fetched', events.length, 'events')
      const fetchedChunkHigh = chunkRangesToFetch[index][0];
      const fetchedChunkLow = chunkRangesToFetch[index][1];
      console.log('Range', fetchedChunkLow, fetchedChunkHigh)
      // return;
      const fetchedChunks: number[] = _.range(fetchedChunkLow, fetchedChunkHigh + 1);
      const chunkEvents = _.map(fetchedChunks, (chunk) => {
        // console.log('Chunk', chunk);
        // const eventsInChunk = _.filter(events);
        return {
          chunk,
          events: [],
        }
      })
      console.log('events length', events.length)
      _.each(events, (e) => {
        // console.log('event fetched', e)
        const chunk = blockToChunk(e.block);
        // console.log('event', e.block, chunk);
        _.find(chunkEvents, {chunk}).events.push(e);
      });
      
      console.log('ChunkEvents', chunkEvents.length, _.filter(chunkEvents, ce => ce.events.length > 0).length);
      saveChunksToDb(accountAddress, tokenAddress, chunkEvents);
      // fetchedChunks.push(chunkEvents);
      return chunkEvents;
      // console.log('events', index, events);
      // saveUserTokenHistory(accountAddress, tokenAddress, events, <number>blockHigh, <number>blockLow).then(() => {
      //   // res.send({events});
      // });
    })
  });

  return Promise.all(fetchs).then((fetchedHistory: any) => {
    console.log('PALL', fetchedHistory.length);
    const dbAndFetchedHistory = dbHistory.concat(fetchedHistory.flat());
    const eventsOnlyHistory = _.orderBy(dbAndFetchedHistory.filter(h => h.events.length > 0), 'chunk', 'desc');
    return res.status(200).send({history: eventsOnlyHistory});
  })

  // let blockHigh, blockLow;
  // if (!blockHigh && !blockLow) {
    // const fetchedBlockNumber: any = await provider.getBlockNumber();
    // blockHigh = parseInt(fetchedBlockNumber);
    // blockLow = blockHigh + MAX_CHUNK_SIZE;
  // }
  // console.log(blockHigh, blockLow)
 
  // await fetchAndSaveBatch(accountAddress, tokenAddress, blockHigh, 1);
  // fetchAllEvents(accountAddress, tokenAddress, blockHigh, blockLow).then(events => {
    // saveUserTokenHistory(accountAddress, tokenAddress, events, <number>blockHigh, <number>blockLow).then(() => {
      // res.send({events});
    // });
  // });

});




app.listen(PORT, () => {
  console.log(`⚡️[server]: Server is running at https://localhost:${PORT}`);
});


// mongodb.MongoClient.connect(mongodbUrl).then(async (db) => {
//   const dbo = db.db('erc20tx');
//   const cursor = await dbo.collection(COLLECTION).find(
//     {account: '0x92A0b2C089733beF43Ac367D2CE7783526AEA590', token: '0x6b175474e89094c44da98b954eedeac495271d0f'},
//     {
//       'history.chunk': {$gte: 11100, $lte: 11127}
//     }
//   );
//   console.log('cursor', cursor)
//   console.log('cursor size', await cursor.count())
//   console.log('cursor next', await cursor.next())
//   // return existingDoc.history;
// });



// http://localhost:8000/apis/1/accounts//tokens/0x6b175474e89094c44da98b954eedeac495271d0f/events
