// hooks/useAudioActions.js
import { useRef } from 'react';
import  useAudioStore  from './audioStore';

export function useAudioActions() {
  const store = useAudioStore.getState();
  const ref = useRef({
    addRegion: store.addRegion,
    removeRegion: store.removeRegion,
    updateRegion: store.updateRegion,
    clearRegions: store.clearRegions,
    setRegions: store.setRegions
  });
  
  return ref.current;
}