import React, { useMemo } from 'react';

import { BigNumber, ethers } from "ethers";

const MAX_ALLOWANCE = BigNumber.from(2).pow(256).sub(1);

function formatBN(bn: BigNumber, decimals: number) {
  if (MAX_ALLOWANCE.eq(bn)) {
    return 'INFINITE';
  } else {
    return ethers.utils.formatUnits(bn, decimals)
  }
}

const EventLine: React.SFC<any> = function({event, tokenInfo}) {

  // TODO : Token info input here
  const amount = useMemo(() => formatBN(event.params.value, tokenInfo.decimals), [event])

  const eventBody = event.type === 'TRANSFER' ?
    (<div>
      <div><span>From</span> <span>{event.params.from}</span></div>
      <div><span>To</span> <span>{event.params.to}</span></div>
      <div><span>Amount</span> <span>{amount} {tokenInfo.symbol}</span></div>
    </div>) :
    (<div>
      <div><span>Spender</span> <span>{event.params.spender}</span></div>
      <div><span>Amount</span> <span>{amount} {tokenInfo.symbol}</span></div>
    </div>);

  return (
    <div>
      <hr/>
      <div>
        <span>{event.block}</span> - <span>{event.type}</span>
        {eventBody}
      </div>
    </div>
  )

};

export default EventLine;