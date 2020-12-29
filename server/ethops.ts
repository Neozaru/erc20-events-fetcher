import { BigNumber, ethers, providers } from "ethers";
import { blockToChunk } from "./utils";

const provider = new providers.InfuraProvider("homestead", {
  projectId: '20bc7cc8b2b84693a8b014781778be8d',
  projectSecret: 'd7f31210a379430d8b3f7a866548907a',
});

const erc20abi = require("./abis/erc20.abi.json");
interface EventLog {
  blockNumber: number,
  args: any;
}
interface TransferEvent extends FormattedEvent {
  params: {
    from: string,
    to: string,
    value: BigNumber,
  }
}
interface ApprovalEvent extends FormattedEvent {
  params: {
    owner: string,
    spender: string,
    value: BigNumber,
  }
}

function formatTransferLog(eventLog: EventLog): TransferEvent {
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

function formatApprovalLog(eventLog: EventLog): ApprovalEvent {
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

const MAX_ALLOWANCE: BigNumber = BigNumber.from(2).pow(256).sub(1);

// Debug function (used on the front-end)
function formatBN(bn: BigNumber, decimals: number): string {
  if (MAX_ALLOWANCE.eq(bn)) {
    return 'INFINITE';
  } else {
    return ethers.utils.formatUnits(bn, decimals)
  }
}

// Debug function
function printTransfer(transfer: TransferEvent, decimals: number): void {
  console.log(`${transfer.block} - TRANSFER - ${transfer.params.from} -> ${transfer.params.to} : ${formatBN(transfer.params.value, decimals)}`);
}

// Debug function
function printApproval(approval: ApprovalEvent, decimals: number): void {
  console.log(`${approval.block} - APPROVAL - ${approval.params.owner} allowed ${approval.params.spender} to spend : ${formatBN(approval.params.value, decimals)}`);
}


// Debug function
function printEvent(event: FormattedEvent, decimals: number): void {
  if (event.type === 'TRANSFER') {
    printTransfer(<TransferEvent>event, decimals);
  } else {
    printApproval(<ApprovalEvent>event, decimals);
  }
}


function fetchEvents(contract, filter, formatter, blockHigh: number, blockLow: number): Promise<FormattedEvent[]> {
  return contract.queryFilter(filter, blockLow, blockHigh).then((logs) => {
    return logs.map(formatter);
  });
}




export interface TokenInfo {
  address: string,
  name: string,
  symbol: string,
  decimals: number,
};

export interface FormattedEvent {
  type: 'TRANSFER' | 'APPROVAL',
  block: number,
}

export async function getTokenInfo(tokenAddress: string): Promise<TokenInfo> {
  const contract = new ethers.Contract(tokenAddress, erc20abi, provider);
  return {
    address: tokenAddress,
    name: await contract.name(),
    symbol: await contract.symbol(),
    decimals: await contract.decimals(),
  };
}

export async function fetchAllEvents(accountAddress: string, tokenAddress: string, blockHigh: number, blockLow: number): Promise<FormattedEvent[]> {

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
    return events;
  });
}

export async function getLatestChunk(): Promise<number> {
  const fetchedBlockNumber: any = await provider.getBlockNumber();
  return blockToChunk(fetchedBlockNumber);
}