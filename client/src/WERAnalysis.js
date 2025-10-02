// WERAnalysis.js
import React from 'react';

const WERAnalysis = () => {
  return (
    <div className="page-content">
      <h1>字错率分析</h1>
      <p>这里是字错率分析功能页面。您可以在这里分析语音识别结果的准确率。</p>
      <div className="feature-placeholder">
        <p>字错率分析功能开发中...</p>
      </div>
    </div>
  );
};

export default WERAnalysis;



// import React, { useEffect, useState } from 'react';
// import AnnoTableConfigPopButton from './AnnoTableConfigPanel';


// const WERAnalysis = ({ dataList }) => {
//   const [columns, setColumns] = useState([]);

//   useEffect(() => {
//     console.log('Current columns:', columns);
//   }, [columns]);

//   return (
//     <div>
//       <AnnoTableConfigPopButton onConfigChange={setColumns} />
      
//     </div>
//   );
// };

// export default WERAnalysis;


