// WERAnalysis.js
import React, { useEffect, useState } from 'react';
import { fetchDatasetList, activateDataset } from './utils/apiService';
import { useNavigate } from 'react-router-dom';
import { useActiveDatasets } from './ActiveDatasetsContext';

const Dataset = () => {
  const [datasets, setDatasets] = useState([]);
  const navigate = useNavigate();
  const { activeDatasets, setActiveDatasets } = useActiveDatasets();

  useEffect(() => {
    const getDatasets = async () => {
      const data = await fetchDatasetList();
      let datasetArr = [];
      if (Array.isArray(data)) {
        datasetArr = data;
      } else if (typeof data === 'object' && data !== null) {
        datasetArr = Object.values(data);
      }
      // 循环打印每个元素的 key，并同步激活状态
      const activeStatus = {};
      datasetArr.forEach((item, idx) => {
        // console.log(`第${idx + 1}个数据集的key:`, Object.keys(item));
        // console.log(`第${idx + 1}个数据集的name:`, item.name);
        // console.log(`第${idx + 1}个数据集的info:`, item.info.activated);
        const datasetName = item.name || (item.info && item.info.dataset_name);
        activeStatus[datasetName] = !!item.info.activated;
      });
      setActiveDatasets(activeStatus); // 同步到 context
      setDatasets(datasetArr);
    };
    getDatasets();
  }, [setActiveDatasets]);

  const handleCardClick = (name, data) => {
    // 传递当前激活状态到详情页
    navigate(`/dataset/${name}`, { state: { dataset: data } });
  };

  const handleActivate = async (name) => {
    const result = await activateDataset(name);
    console.log('激活结果:', result);
    if (result.status === 'success') {
      setActiveDatasets(prev => ({ ...prev, [name]: true }));
    }
  };

  return (
    <div className="page-content">
      <h1>数据集管理</h1>
      <p>这里是数据集管理功能页面。您可以在这里管理语音识别的数据集。</p>
      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
        {datasets.map((item, idx) => {
          const datasetName = item.name || (item.info && item.info.dataset_name);
          const isActive = !!activeDatasets[datasetName];
          return (
            <div
              key={datasetName || idx}
              style={{
                border: isActive ? '2px solid #4caf50' : '1px solid #ccc',
                borderRadius: '8px',
                padding: '16px',
                minWidth: '180px',
                boxShadow: isActive ? '0 2px 12px rgba(76,175,80,0.15)' : '0 2px 8px rgba(0,0,0,0.05)',
                background: isActive ? '#e8f5e9' : '#f5f5f5',
                cursor: 'pointer',
                position: 'relative'
              }}
              onClick={() => handleCardClick(datasetName, item)}
            >
              <div style={{ fontWeight: 'bold', fontSize: '18px', marginBottom: '8px' }}>
                {datasetName}
              </div>
              <div>数量：{item.info ? item.info.num_data : '-'}</div>
              <button
                style={{
                  marginTop: '12px',
                  padding: '6px 12px',
                  cursor: 'pointer',
                  background: isActive ? '#4caf50' : '#bbb',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px'
                }}
                onClick={e => {
                  e.stopPropagation();
                  handleActivate(datasetName);
                }}
                disabled={isActive}
              >
                {isActive ? '已激活' : '激活'}
              </button>
              {isActive && (
                <span style={{
                  position: 'absolute',
                  top: '10px',
                  right: '10px',
                  color: '#4caf50',
                  fontWeight: 'bold',
                  fontSize: '14px'
                }}>激活中</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Dataset;