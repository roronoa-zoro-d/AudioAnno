// App.js
import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navigation from './Navigation';
import SpeechAnno from './SpeechAnno';
import ShortAudioAnnotation from './ShortAudioAnnotation';
import WERAnalysis from './WERAnalysis';
import './App.css';

function App() {
  const [navCollapsed, setNavCollapsed] = useState(false);

  return (
    <Router>
      <div className="app">
        <Navigation collapsed={navCollapsed} setCollapsed={setNavCollapsed} />
        <div className={`main-content ${navCollapsed ? 'collapsed' : ''}`}>
          <Routes>
            <Route path="/" element={<Navigate to="/speech-annotation/long" replace />} />
            <Route path="/speech-annotation/long" element={<SpeechAnno />} />
            <Route path="/speech-annotation/short" element={<ShortAudioAnnotation />} />
            <Route path="/speech-analysis/wer" element={<WERAnalysis />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;