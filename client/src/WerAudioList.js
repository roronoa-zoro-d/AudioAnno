import React, { useState } from 'react';

// 字错率到颜色的简单映射（可根据实际需求调整）
const WER_COLOR_MAP = [
  { threshold: 0.05, color: '#e8f5e9' },   // 低错率 - 绿色
  { threshold: 0.15, color: '#fffde7' },   // 中错率 - 黄色
  { threshold: 1, color: '#ffebee' }       // 高错率 - 红色
];

const getWerColor = (wer) => {
  for (const item of WER_COLOR_MAP) {
    if (wer <= item.threshold) return item.color;
  }
  return '#fff';
};

const WerAudioList = ({
  audioList,
  audioWers,
  loading,
  error,
  onSelectAudio // 音频选择回调函数
}) => {
  const [currentSelected, setCurrentSelected] = useState(null);

  const handleAudioClick = (audio) => {
    setCurrentSelected(audio);
    onSelectAudio(audio);
  };

  // 获取音频的 WER 信息
  const getWerInfo = (audio) => audioWers[audio] || {};

  // 获取音频的 WER 值
  const getWerValue = (audio) => {
    const info = getWerInfo(audio);
    return typeof info.wer === 'number' ? info.wer : null;
  };

  // 获取颜色
  const getStatusColor = (audio) => {
    const wer = getWerValue(audio);
    return wer !== null ? getWerColor(wer) : '#f5f5f5';
  };

  // 获取悬停提示
  const getAudioTooltip = (audio) => {
    const info = getWerInfo(audio);
    if (!info || typeof info.wer !== 'number') return audio;
    return `
字错率 WER: ${(info.wer * 100).toFixed(2)}%
插入: ${info.ins} (${((info.ins / info.num_word) * 100).toFixed(1)}%)
删除: ${info.del} (${((info.del / info.num_word) * 100).toFixed(1)}%)
替换: ${info.sub} (${((info.sub / info.num_word) * 100).toFixed(1)}%)
总词数: ${info.num_word}
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
          加载音频字错率列表中...
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
      }}>音频字错率列表</h2>

      <div style={{
        fontSize: '13px',
        color: '#6c757d',
        marginBottom: '12px',
        textAlign: 'center'
      }}>
        共 {audioList.length} 个音频文件
      </div>

      {/* WER 图例 */}
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
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{
            width: '12px',
            height: '12px',
            backgroundColor: '#e8f5e9',
            borderRadius: '2px',
            marginRight: '4px'
          }}></div>
          <span style={{ fontSize: '12px' }}>低错率 (&lt;5%)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{
            width: '12px',
            height: '12px',
            backgroundColor: '#fffde7',
            borderRadius: '2px',
            marginRight: '4px'
          }}></div>
          <span style={{ fontSize: '12px' }}>中错率 (5%-15%)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{
            width: '12px',
            height: '12px',
            backgroundColor: '#ffebee',
            borderRadius: '2px',
            marginRight: '4px'
          }}></div>
          <span style={{ fontSize: '12px' }}>高错率 (&gt;15%)</span>
        </div>
      </div>

      <ul style={{
        listStyleType: 'none',
        padding: 0,
        margin: 0
      }}>
        {audioList.map((audio) => {
          const wer = getWerValue(audio);
          const statusColor = getStatusColor(audio);
          const isSelected = currentSelected === audio;
          const info = getWerInfo(audio);

          return (
            <li
              key={audio}
              onClick={() => handleAudioClick(audio)}
              style={{
                cursor: 'pointer',
                padding: '10px 12px',
                marginBottom: '6px',
                backgroundColor: isSelected ? '#ffe082' : statusColor, // 选中项高亮
                border: isSelected
                  ? '2px solid #ffb300'
                  : '1px solid #e9ecef',
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

              {/* WER 标签 */}
              <span style={{
                fontSize: '11px',
                fontWeight: '500',
                padding: '2px 6px',
                borderRadius: '10px',
                backgroundColor: 'rgba(255, 255, 255, 0.7)',
                color: '#d32f2f',
                marginLeft: '8px',
                whiteSpace: 'nowrap'
              }}>
                {wer !== null ? `WER: ${(wer * 100).toFixed(2)}%` : '无数据'}
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
          {'暂无音频字错率数据'}
        </div>
      )}
    </div>
  );
};

export default WerAudioList;