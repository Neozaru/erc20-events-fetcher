import React, { useState } from 'react';
import './App.css';
import EventsHistory from './components/EventsHistory';
import EditableAddress from './components/EditableAddress';
import { DEFAULT_TOKEN } from './config';

function App() {

  const [account, setAccount] = useState('');
  const [token, setToken] = useState(DEFAULT_TOKEN);

  return (
    <div>
      <div>
        Account: <EditableAddress onValueEdited={setAccount} />
        Token: <EditableAddress defaultValue={token} onValueEdited={setToken} />
      </div>
      {
      account && token 
      ? <div>
          History :
          <EventsHistory account={account} token={token}/>
        </div>
      : <div>Select token and account</div>
      }
    </div>
  );
}

export default App;
