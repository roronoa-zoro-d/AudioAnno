import React, { createContext, useContext, useState } from 'react';

const ActiveDatasetsContext = createContext();

export const useActiveDatasets = () => useContext(ActiveDatasetsContext);

export const ActiveDatasetsProvider = ({ children }) => {
  const [activeDatasets, setActiveDatasets] = useState({}); // {datasetName: true/false}

  return (
    <ActiveDatasetsContext.Provider value={{ activeDatasets, setActiveDatasets }}>
      {children}
    </ActiveDatasetsContext.Provider>
  );
};