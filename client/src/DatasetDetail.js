import React from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useActiveDatasets } from './ActiveDatasetsContext';

const DatasetDetail = () => {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { name } = useParams();
  const { activeDatasets } = useActiveDatasets();

  // 修复：Hooks必须在组件顶部
  const [hoveredIdx, setHoveredIdx] = React.useState(-1);

  const dataset = state?.dataset;
  const isActive = !!activeDatasets[name];

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
  const columnParams = dataset.info?.table_columns;

  console.log('DatasetDetail - dataset:', dataset);

  // 跳转到SpeechAnno并传递参数
  const handleSplitClick = (splitName) => {
    if (annoType === 'seg_anno') {
      navigate('/speech-annotation/long', {
        state: { datasetName, splitName, columnParams }
      });
    }
    else{
      console.warn('Unsupported annoType:', annoType);
    }
    // 其他类型可在此扩展
  };

  // 跳转到标注结果预览页面并传递参数
  const handlePreviewClick = () => {
    navigate('/speech-show/long', {
      state: { datasetName, columnParams }
    });
  };

    // 跳转到 WER 分析页面
  const handleWerAnalysisClick = (werName) => {
    navigate('/speech-analysis/wer', {
      state: { datasetName, werName }
    });
  };

  // 卡片统一样式
  const cardStyle = {
    border: '1px solid #eee',
    borderRadius: '8px',
    padding: '16px',
    minWidth: '220px',
    background: isActive ? '#e8f5e9' : '#f5f5f5',
    cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
    transition: 'box-shadow 0.2s, border 0.2s',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    marginBottom: '12px'
  };

  const cardHoverStyle = {
    boxShadow: '0 4px 16px rgba(25,118,210,0.12)',
    border: '1.5px solid #1976d2'
  };

  // 用于合并样式
  const mergeStyle = (base, hover, isHover) => isHover ? { ...base, ...hover } : base;

  // WER 卡片渲染
  const werResults = dataset.info?.wer?.results || [];

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

      {/* 新增 WER 结果卡片展示 */}
      {werResults.length > 0 && (
        <>
          <h3 style={{ marginTop: '24px', marginBottom: '8px' }}>字错率(WER)结果:</h3>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '24px' }}>
            {werResults.map((wer, idx) => (
              <div
                key={wer.name || idx}
                style={{
                  ...cardStyle,
                  minWidth: '260px',
                  borderLeft: '6px solid #1976d2'
                }}
                onClick={() => handleWerAnalysisClick(wer.name)}
                onMouseEnter={() => setHoveredIdx(1000 + idx)}
                onMouseLeave={() => setHoveredIdx(-2)}
              >
                <div style={{ fontWeight: 'bold', fontSize: '17px', color: '#1976d2' }}>{wer.name}</div>
                <div style={{ marginTop: '8px', color: '#555' }}>
                  <span>字错率 WER:</span>
                  <span style={{ fontWeight: 'bold', color: '#d32f2f' }}>{(wer.wer * 100).toFixed(2)}%</span>
                </div>
                <div style={{ marginTop: '6px', color: '#888', fontSize: '13px' }}>
                  插入：{(wer.ins / wer.num_word*100).toFixed(1)}%
                  删除：{(wer.del / wer.num_word*100).toFixed(1)}%
                  替换：{(wer.sub / wer.num_word*100).toFixed(1)}%
                </div>
                <div style={{ marginTop: '4px', color: '#888', fontSize: '13px' }}>
                  总词数：{wer.num_word}　总句数：{wer.num_utt}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <h3 style={{ marginTop: '8px' }}>标注预览：</h3>
      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '24px' }}>
        {/* 标注结果预览卡片 */}
        <div
          style={mergeStyle(cardStyle, cardHoverStyle, hoveredIdx === -1)}
          onClick={handlePreviewClick}
          onMouseEnter={() => setHoveredIdx(-1)}
          onMouseLeave={() => setHoveredIdx(-2)}
        >
          <div style={{ fontWeight: 'bold', fontSize: '18px', color: '#1976d2' }}>标注结果预览</div>
          <div style={{ marginTop: '8px', color: '#555' }}>点击查看全部标注结果和波形图</div>
        </div>
      </div>

      <h3 style={{ marginTop: '8px' }}>子数据集标注：</h3>
      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
        {splits.map((split, idx) => (
          <div
            key={split.name || idx}
            style={mergeStyle(cardStyle, cardHoverStyle, hoveredIdx === idx)}
            onClick={() => handleSplitClick(split.name)}
            onMouseEnter={() => setHoveredIdx(idx)}
            onMouseLeave={() => setHoveredIdx(-2)}
          >
            <div style={{ fontWeight: 'bold', fontSize: '16px', color: '#1976d2' }}>{split.name}</div>
            <div style={{ marginTop: '8px', color: '#555' }}>数量：{split.num_data}</div>
            <div style={{ marginTop: '4px', color: '#888', fontSize: '13px' }}>点击进入标注页面</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DatasetDetail;