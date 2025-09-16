import React, { useState } from 'react';
import AnnotationTable from './AnnotationTable';

const AnnotationSelector = ({ annotations, onCompare }) => {
  const [selectedAnnotations, setSelectedAnnotations] = useState([]);

  const handleCheckboxChange = (anno) => {
    if (selectedAnnotations.includes(anno)) {
      setSelectedAnnotations(selectedAnnotations.filter(a => a !== anno));
    } else {
      setSelectedAnnotations([...selectedAnnotations, anno]);
    }
  };

  const handleCompare = () => {
    if (selectedAnnotations.length >= 2) {
      onCompare(selectedAnnotations[0], selectedAnnotations[1]);
    }
  };

  return (
    <div>
      <h3 style={{ color: '#333', marginBottom: '20px' }}>标注选择</h3>
      {annotations.map((anno, index) => (
        <div key={index}>
          <label>
            <input
              type="checkbox"
              checked={selectedAnnotations.includes(anno)}
              onChange={() => handleCheckboxChange(anno)}
            />
            {anno.name}
          </label>
        </div>
      ))}
      <button onClick={handleCompare} style={{ marginTop: '10px' }}>
        比较
      </button>
      {selectedAnnotations.map((anno, index) => (
        <div key={index}>
          <h4 style={{ color: '#333', marginBottom: '20px' }}>{anno.name} 标注信息</h4>
          <AnnotationTable name={anno.name} annotations={anno.anno} />
        </div>
      ))}
    </div>
  );
};

export default AnnotationSelector;