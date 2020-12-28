import { BigNumber, ethers, providers } from "ethers";
import { blockToChunk } from "./utils";

const provider = new providers.InfuraProvider("homestead", {
  projectId: '20bc7cc8b2b84693a8b014781778be8d',
  projectSecret: 'd7f31210a379430d8b3f7a866548907a',
});


const erc20abi = require("./abis/erc20.abi.json");


function formatTransferLog(eventLog: any) {
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

const MAX_ALLOWANCE = BigNumber.from(2).pow(256).sub(1);

// Debug function (used on the front-end)
function formatBN(bn, decimals: number) {
  if (MAX_ALLOWANCE.eq(bn)) {
    return 'INFINITE';
  } else {
    return ethers.utils.formatUnits(bn, decimals)
  }
}

// Debug function
function printTransfer(transfer: any, decimals: number) {
  console.log(`${transfer.block} - TRANSFER - ${transfer.params.from} -> ${transfer.params.to} : ${formatBN(transfer.params.value, decimals)}`);
}

// Debug function
function printApproval(approval: any, decimals: number) {
  console.log(`${approval.block} - APPROVAL - ${approval.params.owner} allowed ${approval.params.spender} to spend : ${formatBN(approval.params.value, decimals)}`);
}


// Debug function
function printEvent(event: any, decimals: number) {
  if (event.type === 'TRANSFER') {
    printTransfer(event, decimals);
  } else {
    printApproval(event, decimals);
  }
}


function fetchEvents(contract, filter, formatter, blockHigh: number, blockLow: number) {
  return contract.queryFilter(filter, blockLow, blockHigh).then((logs) => {
    return logs.map(formatter);
  });
}


export async function fetchAllEvents(accountAddress, tokenAddress, blockHigh, blockLow) {

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

export async function getCurrentChunk(): Promise<number> {
  const fetchedBlockNumber: any = await provider.getBlockNumber();
  return blockToChunk(fetchedBlockNumber);
}