import React from 'react';
import { data, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useActiveDatasets } from './ActiveDatasetsContext';

const DatasetDetail = () => {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { name } = useParams();
  const { activeDatasets } = useActiveDatasets();

  const dataset = state?.dataset;
  const isActive = !!activeDatasets[name];

  console.log('DatasetDetail received dataset:', dataset);

  if (!dataset) {
    return (
      <div className="page-content">
        <button onClick={() => navigate(-1)} style={{ marginBottom: '16px' }}>返回</button>
        <h2>未找到数据集信息：{name}</h2>
      </div>
    );
  }

  const splits = dataset.info?.splits || [];
  const annoType = dataset.info?.anno_type;
  const datasetName = dataset.info?.dataset_name;
  const columnParams = dataset.info?.table_columns

  // 跳转到SpeechAnno并传递参数
  const handleSplitClick = (splitName) => {
    // console.log('点击 ', datasetName, splitName, columnParams);
    if (annoType === 'seg_anno') {
      navigate('/speech-annotation/long', {
        state: { datasetName, splitName, columnParams }
      });
    }
    // 其他类型可在此扩展
  };

  return (
    <div className="page-content" style={{
      background: isActive ? '#e8f5e9' : '#f5f5f5',
      borderRadius: '8px',
      padding: '24px',
      boxShadow: isActive ? '0 2px 12px rgba(76,175,80,0.15)' : '0 2px 8px rgba(0,0,0,0.05)'
    }}>
      <button onClick={() => navigate(-1)} style={{ marginBottom: '16px' }}>返回</button>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <h2 style={{ margin: 0 }}>数据集详情：{datasetName}</h2>
        {isActive && (
          <span style={{
            color: '#4caf50',
            fontWeight: 'bold',
            fontSize: '16px',
            border: '1px solid #4caf50',
            borderRadius: '4px',
            padding: '2px 8px',
            background: '#e8f5e9'
          }}>
            已激活
          </span>
        )}
      </div>
      <div>总数量：{dataset.info?.num_data}</div>
      <h3 style={{ marginTop: '16px' }}>子集信息：</h3>
      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
        {splits.map((split, idx) => (
          <div
            key={split.name || idx}
            style={{
              border: '1px solid #eee',
              borderRadius: '8px',
              padding: '12px',
              minWidth: '200px',
              background: isActive ? '#e8f5e9' : '#f5f5f5',
              cursor: 'pointer'
            }}
            onClick={() => handleSplitClick(split.name)}
          >
            <div style={{ fontWeight: 'bold' }}>{split.name}</div>
            <div>数量：{split.num_data}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DatasetDetail;