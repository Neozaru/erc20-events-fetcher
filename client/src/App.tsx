import React from 'react';
import logo from './logo.svg';
import './App.css';
import EventsHistory from './components/EventsHistory';

function App() {
  return (
    <div>
      History :
      <EventsHistory account={'0x92A0b2C089733beF43Ac367D2CE7783526AEA590'} token={'0x6b175474e89094c44da98b954eedeac495271d0f'}/>
    </div>
  );
}

export default App;
