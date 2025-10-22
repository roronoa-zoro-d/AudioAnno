import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';
import WerAudioList from './WerAudioList';
import AudioWaveform from './AudioWaveform';
import WerTable from './WerTable'; // 新增导入
import WerAnno from './WerAnno'; // 新增导入
import { fetchWerAnnotation } from './utils/apiService';
import './SpeechAnno.css';
import { useLocation } from 'react-router-dom';
import { API_HOST } from './utils/apiService';

const WERAnalysis = () => {
  const { state } = useLocation();
  const datasetName = state?.datasetName;
  const werName = state?.wer_name || state?.werName;

  // Refs
  const audioWaveformRef = useRef(null);

  // State
  const [audioData, setAudioData] = useState(null);
  const [loading, setLoading] = useState(false);
  // const [activeRegionId, setActiveRegionId] = useState(null);
  const [audioList, setAudioList] = useState([]);
  const [audioWers, setAudioWers] = useState({});
  const [audioLoading, setAudioLoading] = useState(false);
  const [audioError, setAudioError] = useState(null);
  const [werTableData, setWerTableData] = useState([]); // 新增
  // const [waveformReady, setWaveformReady] = useState(false); // 新增

  // 新增：minPxPerSec 状态，默认30
  const [minPxPerSec, setMinPxPerSec] = useState(30);

  // 获取 WER 音频列表和字错率信息
  useEffect(() => {
    const fetchWerAudioList = async () => {
      setAudioLoading(true);
      setAudioError(null);
      try {
        const res = await fetch(`${API_HOST}/api/wer_list/${datasetName}/${werName}`);
        if (!res.ok) throw new Error('服务器返回错误');
        const data = await res.json();
        setAudioList(data.audios || []);
        setAudioWers(data.wer || {});
      } catch (error) {
        setAudioError(error.message || '获取音频字错率列表失败');
      } finally {
        setAudioLoading(false);
      }
    };
    if (datasetName && werName) {
      fetchWerAudioList();
    }
  }, [datasetName, werName]);

  // 点击列表中的音频，获取标注信息和 WER 表格数据
  const handleSelectAudio = useCallback(async (audioId) => {
    if (!audioId) {
      setAudioData(null);
      setWerTableData([]);
      return;
    }
    setLoading(true);
    // setWaveformReady(false);

    try {
      // fetchWerAnnotation 返回的 annotationData 结构需包含 wer_table 字段
      const [annotationData] = await Promise.all([fetchWerAnnotation(datasetName, werName, audioId)]);
     

      setAudioData({
        audioUrl: `${API_HOST}/api/audio/${datasetName}/${audioId}`,
        annotationData: annotationData,
        audioId
      });

      // 假设 annotationData.wer_table 或 annotationData[0].wer_table 为表格数据
      // 你可以根据实际接口调整
      if (annotationData) {
        setWerTableData(annotationData);
      } else {
        setWerTableData([]);
      }
    } catch (error) {
      setAudioData({
        audioUrl: `${API_HOST}/api/audio/${datasetName}/${audioId}`,
        annotationData: [],
        audioId,
        error: error.message
      });
      setWerTableData([]);
    } finally {
      setLoading(false);
    }
  }, [datasetName, werName]);

  // 波形图回调：高亮 WER 区域（优化颜色叠加）
  const handleAudioReady = useCallback(() => {
    if (
      audioWaveformRef.current &&
      audioData?.annotationData &&
      Array.isArray(audioData.annotationData)
    ) {
      audioWaveformRef.current.clearRegions?.();

      audioData.annotationData.forEach((werItem, idx) => {
        // 合并区域底色（淡黄，透明度低）
        audioWaveformRef.current.createRegion(
          werItem.merged_seg[0] / 1000,
          werItem.merged_seg[1] / 1000,
          'rgba(255, 235, 59, 0.15)', // 淡黄底色
          `merged-${idx}`
        );

        // 标注参考文本区域（蓝色，透明度高，覆盖底色）
        werItem.ref_segs.forEach((ref, refIdx) => {
          audioWaveformRef.current.createRegion(
            ref.seg[0] / 1000,
            ref.seg[1] / 1000,
            'rgba(33, 150, 243, 0.35)', // 深蓝
            `ref-${idx}-${refIdx}`
          );
        });

        // 模型识别文本区域（绿色，透明度高，覆盖底色）
        werItem.asr_segs.forEach((asr, asrIdx) => {
          audioWaveformRef.current.createRegion(
            asr.seg[0] / 1000,
            asr.seg[1] / 1000,
            'rgba(76, 175, 80, 0.35)', // 深绿
            `asr-${idx}-${asrIdx}`
          );
        });
      });

      // setWaveformReady(true);
    }
  }, [audioData]);

  // 表格时间戳点击：播放对应区域
  const handleTableTimeClick = useCallback((start, end) => {
    if (audioWaveformRef.current) {
      audioWaveformRef.current.playRegion(start, end);
    }
  }, []);

  return (
    <div className="app-container">
      {/* 左侧音频列表（WER） */}
      <div className="audio-list-container">
        <div className="audio-list-header">
          字错率音频列表
        </div>
        <WerAudioList
          audioList={audioList}
          audioWers={audioWers}
          loading={audioLoading}
          error={audioError}
          onSelectAudio={handleSelectAudio}
        />
      </div>

      {/* 右侧内容区域 */}
      <div className="content-container">
        {/* 波形图参数设置区域（只保留滑动条） */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '10px 0 4px 0' }}>
                  <Typography variant="body2" sx={{ minWidth: 90 }}>波形密度 (minPxPerSec):</Typography>
                  <input
                    type="range"
                    min={0}
                    max={50}
                    step={10}
                    value={minPxPerSec}
                    onChange={e => setMinPxPerSec(Number(e.target.value))}
                    style={{ width: 120 }}
                  />
                  <span style={{ fontSize: 13, color: '#888' }}>{minPxPerSec}</span>
                </div>
        {/* 波形图区域 */}
        <div className="waveform-container">
          
          {!audioData ? (
            <Placeholder text="请选择音频文件" />
          ) : loading ? (
            <LoadingState />
          ) : audioData.error ? (
            <ErrorState error={audioData.error} />
          ) : (
            <AudioWaveform
              ref={audioWaveformRef}
              audioUrl={audioData.audioUrl}
              onAudioReady={handleAudioReady}
              // activeRegionId={activeRegionId}
              key={audioData.audioId}
            />
          )}
        </div>

        {/* 颜色图例区域 */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '24px',
          margin: '18px 0 12px 0',
          padding: '8px 0 8px 12px',
          background: '#fafafa',
          borderRadius: '6px',
          border: '1px solid #eee',
          fontSize: '14px'
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{
              width: 24,
              height: 16,
              background: 'rgba(255, 235, 59, 0.15)',
              border: '1px solid #e0e0e0',
              borderRadius: 3,
              display: 'inline-block'
            }} />
            合并区域
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{
              width: 24,
              height: 16,
              background: 'rgba(33, 150, 243, 0.35)',
              border: '1px solid #e0e0e0',
              borderRadius: 3,
              display: 'inline-block'
            }} />
            参考文本区域
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{
              width: 24,
              height: 16,
              background: 'rgba(76, 175, 80, 0.35)',
              border: '1px solid #e0e0e0',
              borderRadius: 3,
              display: 'inline-block'
            }} />
            模型文本区域
          </span>
        </div>

        {/* 标注原因标注组件 */}
        {audioData?.audioId && (
          <div style={{ marginBottom: 24 }}>
            <WerAnno
              datasetName={datasetName}
              werName={werName}
              audioId={audioData.audioId}
            />
          </div>
        )}

        {/* 标注表格区域（WER 分段对比） */}
        <div className="annotation-table-container">
          <div className="table-header">
            <div className="table-title">WER分段对比表</div>
          </div>
          <WerTable data={werTableData} onTimeClick={handleTableTimeClick} />
        </div>
      </div>
    </div>
  );
};

// 辅助组件
const Placeholder = ({ text }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
    <Typography variant="h6" color="text.secondary">
      {text}
    </Typography>
  </Box>
);

const LoadingState = () => (
  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 2 }}>
    <CircularProgress />
    <Typography>加载中...</Typography>
  </Box>
);

const ErrorState = ({ error }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
    <Typography color="error">
      加载失败: {error}
    </Typography>
  </Box>
);

export default WERAnalysis;