import React, { useState } from 'react';

// 定义标注状态到颜色的映射
const STATUS_COLOR_MAP = {
  'unlabeled': '#f8f9fa',      // 未标注 - 浅灰色
  'labeled': '#e3f2fd',        // 已标注 - 浅蓝色
  'unchecked': '#fff3e0',     // 已提交待质检 - 浅橙色
  'verified': '#d0f5e8',       // 质检通过 - 浅绿色
  'rejected': '#ffe0e0',       // 质检拒绝需重标 - 浅红色
  'discarded': '#7d5b3dff',      // 已丢弃 - 更浅灰色
};

const STATUS_LABEL_MAP = {
  'unlabeled': '未标注',
  'labeled': '已标注',
  'unchecked': '待质检',
  'verified': '已质检',
  'rejected': '需重标',
  'discarded': '已丢弃',
}

// 统计项配置
const STAT_CONFIG = {
  anno_status: ['unlabeled', 'labeled', 'submitted'],
  check_status: ['unchecked', 'verified', 'rejected', 'discarded'],
};

const AudioList = ({
  audioList,
  audioStates,
  loading,
  error,
  status_key,   // 状态键名, 标注状态或者质检状态 anno_status  check_status
  onSelectAudio // 音频选择回调函数
}) => {
  const [currentSelected, setCurrentSelected] = useState(null);




  const handleAudioClick = (audio) => {
    setCurrentSelected(audio);
    onSelectAudio(audio);
    console.log('select audio:', audio, ' state:', audioStates[audio]);
  };

  // 获取音频状态
  const getAudioStatus = (audio) => {
    const state = audioStates[audio][status_key];
    return state 
  };
  const getAudioLabel = (audio) => {
    const state = audioStates[audio][status_key];
    // console.log('audio state:', state);
    return state ? STATUS_LABEL_MAP[state] || '未知标签1' : '未知状态2';
  }

  // 获取状态颜色
  const getStatusColor = (status) => {
    return STATUS_COLOR_MAP[status] || '#f5f5f5';
  };

  // 获取状态标签
  const getStatusLabel = (status) => {
    return STATUS_LABEL_MAP[status] || '未知标签3';
  };

  // 获取统计项
  const statKeys = STAT_CONFIG[status_key] || [];
    // 统计数据
  const statData = statKeys.map(key => ({
    label: getStatusLabel(key),
    count: audioList.filter(audio => getAudioStatus(audio) === key).length
  }));


  // 获取音频的详细信息（用于悬停提示）
  const getAudioTooltip = (audio) => {
    const state = audioStates[audio][status_key];
    if (!state) return audio;

    return `
标注状态: ${getAudioLabel(audio)}
标注者: ${state.annotator || '未分配'}
审核状态: ${state.check_status === 'checked' ? '已审核' : '未审核'}
提交次数: ${state.submit_times || 0}
最后更新: ${state.last_updated || '从未更新'}
    `.trim();
  };

  if (loading) {
    return (
      <div style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '15px',
        backgroundColor: '#f8f9fa'
      }}>
        <div style={{ textAlign: 'center', color: '#6c757d' }}>
          加载音频列表中...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '15px',
        backgroundColor: '#f8f9fa'
      }}>
        <div style={{ textAlign: 'center', color: '#dc3545' }}>
          {error}
        </div>
      </div>
    );
  }

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

      {/* 音频统计信息 */}
      <div style={{
        fontSize: '12px',
        color: '#6c757d',
        marginBottom: '15px',
        padding: '8px',
        backgroundColor: '#fff',
        borderRadius: '4px',
        border: '1px solid #e9ecef'
      }}>
        {/* <div style={{ display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap' }}>
          <span>未标注: {audioList.filter(audio => getAudioStatus(audio) === 'unlabeled').length}</span>
          <span>已标注: {audioList.filter(audio => getAudioStatus(audio) === 'labeled').length}</span>
          <span>已提交: {audioList.filter(audio => getAudioStatus(audio) === 'submitted').length}</span>
        </div> */}
        <div style={{ display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap' }}>
          {statData.map(item => (
            <span key={item.label}>{item.label}: {item.count}</span>
          ))}
        </div>
      </div>

      <ul style={{
        listStyleType: 'none',
        padding: 0,
        margin: 0
      }}>
        {audioList.map((audio) => {
          const status = getAudioStatus(audio);
          const statusColor = getStatusColor(status);
          const isSelected = currentSelected === audio;


          return (
            <li
              key={audio}
              onClick={() => handleAudioClick(audio)}
              style={{
                cursor: 'pointer',
                padding: '10px 12px',
                marginBottom: '6px',
                backgroundColor: isSelected ? '#ffe082' : statusColor, // 选中为高亮黄色
                border: isSelected
                  ? '2px solid #ffb300'
                  : `1px solid ${status === 'unlabeled' ? '#e9ecef' : '#d1e7ff'}`,
                borderRadius: '5px',
                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                minHeight: '40px',
                position: 'relative'
              }}
              title={getAudioTooltip(audio)}
            >
              {/* 音频文件名 */}
              <span style={{
                flex: 1,
                fontSize: '13px',
                fontWeight: isSelected ? '500' : '400',
                color: isSelected ? '#ff9800' : '#495057',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                maxWidth: '100%',
                display: 'block'
              }}>
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
                {getAudioLabel(audio)}
              </span>


              {/* 选中指示器 */}
              {isSelected && (
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: '4px',
                  transform: 'translateY(-50%)',
                  width: '4px',
                  height: '16px',
                  backgroundColor: '#ffb300',
                  borderRadius: '2px'
                }} />
              )}
            </li>
          );
        })}
      </ul>

      {/* 空状态提示 */}
      {audioList.length === 0 && (
        <div style={{
          textAlign: 'center',
          color: '#6c757d',
          padding: '40px 20px',
          fontSize: '14px'
        }}>
          {'请选择数据集和分割'}
        </div>
      )}
    </div>
  );
};

export default AudioList;