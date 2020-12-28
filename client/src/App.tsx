import React, { useEffect, useMemo, useState } from 'react';
import './App.css';
import EventsHistory from './components/EventsHistory';
import EditableAddress from './components/EditableAddress';
import { DEFAULT_TOKEN } from './config';
import { API_ENDPOINT } from './config';

function callGetTokenInfo(tokenAddress: string) {
  return fetch(`${API_ENDPOINT}/tokens/${tokenAddress}`, {
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
  })
  .then(res => res.json());
}

interface TokenInfo {
  name: string,
  symbol: string,
  decimals: number,
  address: string,
}

function App() {

  const [accountAddress, setAccountAddress] = useState('');
  const [tokenAddress, setTokenAddress] = useState(DEFAULT_TOKEN);

  const [tokenInfo, setTokenInfo] = useState<TokenInfo>();

  useEffect(() => {
    callGetTokenInfo(tokenAddress).then(setTokenInfo);
  }, [tokenAddress]);

  return (
    <div>
      <div>
        <div>
          Account: <EditableAddress onValueEdited={setAccountAddress} />
        </div>
        <div>
          Token: <EditableAddress defaultValue={tokenAddress} onValueEdited={setTokenAddress} /> {tokenInfo ? `(${tokenInfo.symbol})` : ''}
        </div>
      </div>
      {
      accountAddress && tokenInfo 
      ? <div>
          History :
          <EventsHistory accountAddress={accountAddress} tokenInfo={tokenInfo}/>
        </div>
      : <div>Select token and account</div>
      }
    </div>
  );
}

export default App;
