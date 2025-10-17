// App.js
import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navigation from './Navigation';
import SpeechAnno from './SpeechAnno';
import Dataset from './Dataset';
import DatasetDetail from './DatasetDetail';
import ShortAudioAnnotation from './ShortAudioAnnotation';
import WERAnalysis from './WERAnalysis';
import { ActiveDatasetsProvider } from './ActiveDatasetsContext';
import Auth from './Auth';
import { UserProvider } from './UserContext';
import './App.css';
import LongAudioShow from './LongAudioShow';
import ShortAudioShow from './ShortAudioShow';

function App() {
  const [navCollapsed, setNavCollapsed] = useState(false);

  return (
    <UserProvider>
      <ActiveDatasetsProvider>
        <Router>
          <div className="app">
            <Navigation collapsed={navCollapsed} setCollapsed={setNavCollapsed} />
            <div className={`main-content ${navCollapsed ? 'collapsed' : ''}`}>
              <Routes>
                <Route path="/" element={<Auth />} />
                <Route path="/speech-annotation/long" element={<SpeechAnno />} />
                <Route path="/speech-annotation/short" element={<ShortAudioAnnotation />} />
                <Route path="/speech-analysis/wer" element={<WERAnalysis />} />
                <Route path="/datasetManager/dataset" element={<Dataset />} />
                <Route path="/dataset/:name" element={<DatasetDetail />} />
                <Route path="/speech-show/long" element={<LongAudioShow />} />
                <Route path="/speech-show/short" element={<ShortAudioShow />} />
              </Routes>
            </div>
          </div>
        </Router>
      </ActiveDatasetsProvider>
    </UserProvider>
  );
}

export default App;