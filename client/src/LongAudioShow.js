import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Box,
  Typography,
  CircularProgress,
} from '@mui/material';
import AudioList from './AudioList';
import AudioWaveform from './AudioWaveform';
import AnnoTable from './AnnoTable';
import { fetchAnnotation } from './utils/apiService';
import { getColumnsByParams } from './tableColumns';
import './SpeechAnno.css';
import { useLocation } from 'react-router-dom';
import { API_HOST } from './utils/apiService';

const LongAudioShow = () => {
  const { state } = useLocation();
  const datasetName = state?.datasetName;
  const columnParams = state?.columnParams;

  // Refs
  const audioWaveformRef = useRef(null);

  // State
  const [audioData, setAudioData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeRegionId, setActiveRegionId] = useState(null);
  const [audioList, setAudioList] = useState([]);
  const [audioStates, setAudioStates] = useState({});
  const [audioLoading, setAudioLoading] = useState(false);
  const [audioError, setAudioError] = useState(null);

  // 修正 columnParams：将第一个元素（列表）中的 textEdit 改为 text
  let fixedColumnParams = columnParams;
  if (Array.isArray(columnParams) && Array.isArray(columnParams[0])) {
    fixedColumnParams = [
      columnParams[0].map(col =>
        col === 'textEdit' ? 'text' : col
      ),
      ...columnParams.slice(1)
    ];
  }

  // 获取表格列配置
  const columns = getColumnsByParams(fixedColumnParams);

  // 获取整个数据集的音频列表和音频状态（不再需要 splitName）
  useEffect(() => {
    const fetchAudioListAndStates = async () => {
      setAudioLoading(true);
      setAudioError(null);
      try {
        const res = await fetch(`${API_HOST}/api/dataset/anno_list/${datasetName}`);
        if (!res.ok) throw new Error('服务器返回错误');
        const data = await res.json();
        setAudioList(data.audios || []);
        setAudioStates(data.state || {});
      } catch (error) {
        setAudioError(error.message || '获取音频列表失败');
      } finally {
        setAudioLoading(false);
      }
    };
    if (datasetName) {
      fetchAudioListAndStates();
    }
  }, [datasetName]);

  // 点击列表中的音频，获取标注信息
  const handleSelectAudio = useCallback(async (audioId) => {
    if (!audioId) {
      setAudioData(null);
      return;
    }
    setLoading(true);

    try {
      const [annotationData] = await Promise.all([fetchAnnotation(datasetName, audioId)]);
      const processedData = annotationData.map(item => ({
        ...item,
        id: item.id || `external-anno-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        start: item.seg[0] / 1000,
        end: item.seg[1] / 1000
      })).sort((a, b) => a.seg[0] - b.seg[0]);

      setAudioData({
        audioUrl: `${API_HOST}/api/audio/${datasetName}/${audioId}`,
        annotationData: processedData,
        audioId
      });
    } catch (error) {
      setAudioData({
        audioUrl: `${API_HOST}/api/audio/${datasetName}/${audioId}`,
        annotationData: [],
        audioId,
        error: error.message
      });
    } finally {
      setLoading(false);
    }
  }, [datasetName]);

  // 波形图回调：只初始化高亮区域，不允许编辑
  const handleAudioReady = useCallback(() => {
    if (audioWaveformRef.current && audioData?.annotationData) {
      audioData.annotationData.forEach((item) => {
        audioWaveformRef.current.createRegion(
          item.start || item.seg[0] / 1000,
          item.end || item.seg[1] / 1000,
          item.color || 'rgba(100, 149, 237, 0.2)',
          item.id
        );
      });
    }
  }, [audioData]);

  // 表格行点击：播放对应区域
  const handleTableRowClick = useCallback((item) => {
    if (audioWaveformRef.current) {
      audioWaveformRef.current.playRegion(item.seg[0] / 1000, item.seg[1] / 1000);
      setActiveRegionId(item.id);
    }
  }, []);

  return (
    <div className="app-container">
      {/* 左侧音频列表 */}
      <div className="audio-list-container">
        <div className="audio-list-header">
          音频列表
        </div>
        <AudioList
          audioList={audioList}
          audioStates={audioStates}
          loading={audioLoading}
          error={audioError}
          onSelectAudio={handleSelectAudio}
        />
      </div>

      {/* 右侧内容区域 */}
      <div className="content-container">
        {/* 波形图区域 */}
        <div className="waveform-container">
          <div className="waveform-title">音频波形图</div>
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
              activeRegionId={activeRegionId}
              key={audioData.audioId}
            />
          )}
        </div>

        {/* 标注表格区域 */}
        <div className="annotation-table-container">
          <div className="table-header">
            <div className="table-title">标注结果</div>
          </div>
          {audioData && !loading && !audioData.error && (
            <AnnoTable
              data={audioData.annotationData}
              columns={columns}
              activeRegionId={activeRegionId}
              onRowClick={handleTableRowClick}
            />
          )}
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

export default LongAudioShow;