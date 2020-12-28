import { MongoClient } from 'mongodb';
import _ from "lodash";

const DB_ENDPOINT = process.env.DB_ENDPOINT ?? "mongodb://localhost:27017/erc20tx";
console.log('DB endpont', DB_ENDPOINT)

const DB_COLLECTION = 'userTokenHistory';


/** Chunks are stored in an sub-array inside "account-token" documents.
 *  Performances are terrible. Playing with projections in the requests 
 *  might likely increase performance but it is likely that this design
 *  must be changed in case of a production environment.
 *  MongoDB might provide features allowing to use chunk numbers as keys.
 *  Otherwise, poor old relational database might be a good fit if keeping
 *  current design (?).
 */
export function fetchChunksFromDb(account, token, chunkHigh, chunkLow) {
  return MongoClient.connect(DB_ENDPOINT).then(async (db) => {
    const dbo = db.db('erc20tx');
    const cursor = await dbo.collection(DB_COLLECTION).aggregate([
      { "$match": {account, token}},
      { "$unwind": "$history" },
  
      { "$match": {"history.chunk": {$gte: chunkLow, $lte: chunkHigh}}}
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

  });
}

export function saveChunksToDb(account, token, chunksWithEvents) {
  return MongoClient.connect(DB_ENDPOINT).then(async (db) => {
    const dbo = db.db('erc20tx');
    const existingDoc = await dbo.collection(DB_COLLECTION).findOne({account, token});
    if (!existingDoc) {
      console.log(`Creating fresh DB history for ${account}/${token}`)
      const newDoc = {
        account,
        token,
        history: chunksWithEvents,
      };
      await dbo.collection(DB_COLLECTION).insertOne(newDoc);
    } else {
      console.log(`Adding chunks to DB history for ${account}/${token}`)
      await dbo.collection(DB_COLLECTION).updateOne(
        {_id: existingDoc._id},
        {
          $push: {history: {$each: chunksWithEvents}}
        }
      );
    }
    db.close();
  });
}
