import React, { useEffect } from 'react';
import useAnnotationStore from './store/DatasetAnnotation';

// 定义标注状态到颜色的映射
const STATUS_COLOR_MAP = {
  'unlabeled': '#f5f5f5',      // 未标注 - 浅灰色
  'labeled': '#e6f7ff',        // 已标注 - 浅蓝色
  'submitted': '#f9f0ff',      // 已提交 - 浅紫色
};

const AudioListPure = () => {
  const {
    audioList,
    audioStates,
    selectedAudio,
    fetchAudioData,
    setSelectedAudio
  } = useAnnotationStore();



  const handleAudioClick = (audio) => {
    setSelectedAudio(audio);
  };

  // 获取音频状态
  const getAudioStatus = (audio) => {
    const state = audioStates[audio];
    return state ? state.anno_status || 'unlabeled' : 'unlabeled';
  };

  // 获取状态颜色
  const getStatusColor = (audio) => {
    const status = getAudioStatus(audio);
    return STATUS_COLOR_MAP[status] || '#f5f5f5'; // 默认颜色
  };

  // 获取状态标签
  const getStatusLabel = (audio) => {
    const status = getAudioStatus(audio);
    const labels = {
      'unlabeled': '未标注',
      'labeled': '已标注',
      'submitted': '已提交',
    };
    return labels[status] || status;
  };

  return (
    <div style={{ 
      width: '100%',
      height: '100%', 
      overflowY: 'auto',
      padding: '15px',
      backgroundColor: '#f8f9fa',
      borderRight: '1px solid #dee2e6',
      boxSizing: 'border-box'
    }}>
      <h2 style={{ 
        color: '#495057',
        marginBottom: '15px',
        textAlign: 'center',
        fontSize: '16px',
        fontWeight: '600'
      }}>音频列表</h2>
      
      <div style={{
        fontSize: '13px',
        color: '#6c757d',
        marginBottom: '12px',
        textAlign: 'center'
      }}>
        共 {audioList.length} 个音频文件
      </div>

      {/* 状态图例 */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: '8px',
        marginBottom: '15px',
        padding: '8px',
        backgroundColor: '#fff',
        borderRadius: '4px',
        border: '1px solid #e9ecef'
      }}>
        {Object.entries(STATUS_COLOR_MAP).map(([status, color]) => (
          <div key={status} style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{
              width: '12px',
              height: '12px',
              backgroundColor: color,
              borderRadius: '2px',
              marginRight: '4px'
            }}></div>
            <span style={{ fontSize: '12px' }}>{getStatusLabel(status)}</span>
          </div>
        ))}
      </div>

      <ul style={{
        listStyleType: 'none',
        padding: 0,
        margin: 0
      }}>
        {audioList.map((audio) => {
          const status = getAudioStatus(audio);
          const statusColor = getStatusColor(audio);
          const isSelected = selectedAudio === audio;
          
          return (
            <li 
              key={audio} 
              onClick={() => handleAudioClick(audio)} 
              style={{
                cursor: 'pointer',
                padding: '10px 12px',
                marginBottom: '6px',
                backgroundColor: isSelected ? '#e3f2fd' : statusColor,
                border: isSelected 
                  ? '2px solid #2196f3' 
                  : `1px solid ${status === 'unlabeled' ? '#e9ecef' : '#d1e7ff'}`,
                borderRadius: '5px',
                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                minHeight: '40px',
                position: 'relative'
              }}
            >
              <span style={{ 
                flex: 1,
                fontSize: '13px',
                fontWeight: isSelected ? '500' : '400',
                color: isSelected ? '#1976d2' : '#495057',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                maxWidth: '100%',
                display: 'block'
              }}
              title={audio}
              >
                {audio}
              </span>
              
              {/* 状态标签 */}
              <span style={{
                fontSize: '11px',
                fontWeight: '500',
                padding: '2px 6px',
                borderRadius: '10px',
                backgroundColor: 'rgba(255, 255, 255, 0.7)',
                color: '#495057',
                marginLeft: '8px',
                whiteSpace: 'nowrap'
              }}>
                {getStatusLabel(audio)}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default AudioListPure;