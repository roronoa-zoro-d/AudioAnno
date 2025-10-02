import React, { useState, useRef, useCallback, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  CircularProgress,
  Button,
  Snackbar,
  Alert
} from '@mui/material';
import AudioList from './AudioList';
import AudioWaveform from './AudioWaveform';
import AnnoTable from './AnnoTable';
import { fetchAnnotation, uploadAnnotations } from './utils/apiService';
import { getColumnsByParams } from './tableColumns';
import './SpeechAnno.css';
import { useLocation } from 'react-router-dom';

// 纯排序函数
const sortAnnoByStartTime = (items) => {
    return [...items].sort((a, b) => a.seg[0] - b.seg[0]);
};

const SpeechAnno = () => {
  const { state } = useLocation();
  const datasetName = state?.datasetName;
  const splitName = state?.splitName;
  const columnParams = state?.columnParams;

  console.log('SpeechAnno收到的datasetName:', datasetName);
  console.log('SpeechAnno收到的splitName:', splitName);
  console.log('SpeechAnno收到的columnParams:', columnParams)

  // Refs
  const audioWaveformRef = useRef(null);
  
  // State
  const [audioData, setAudioData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeRegionId, setActiveRegionId] = useState(null);
  const [hasChanges, setHasChanges] = useState(false); // 标记是否有未保存的修改
  const [isUploading, setIsUploading] = useState(false); // 上传状态
  const [snackbar, setSnackbar] = useState({ // 消息提示
    open: false,
    message: '',
    severity: 'success'
  });
  
  // 存储初始标注数据用于比较
  const initialAnnotationsRef = useRef([]);

  // 使用 ref 存储最新状态避免闭包问题
  const stateRef = useRef();
  stateRef.current = {
    audioData,
    activeRegionId
  };

  // 获取表格列配置
												 
													  
													
//   const columns = getColumnsByType('qualityCheck');
//   const columns = getColumnsByType('vadAnnoCheck');
  const columns = getColumnsByParams(columnParams);

  // 点击列表中的音频， 从服务器获取这个音频的标注信息
  const handleSelectAudio = useCallback(async (audioId) => {
    if (!audioId) {
      setAudioData(null);
      setHasChanges(false); // 重置修改状态
      return;
    }

    setLoading(true);
    
    try {
      const [annotationData] = await Promise.all([fetchAnnotation(datasetName, audioId)]);
      
      const processedData = annotationData.map(item => ({
        ...item,
        id: item.id || `external-anno-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        start: item.seg[0]/1000,
        end: item.seg[1]/1000
      })).sort((a, b) => a.seg[0] - b.seg[0]);

      // 保存初始标注数据
      initialAnnotationsRef.current = JSON.parse(JSON.stringify(processedData));
      
      setAudioData({
        audioUrl: `http://localhost:9801/api/audio/${datasetName}/${audioId}`,
        annotationData: processedData,
        audioId
      });
      setHasChanges(false); // 重置修改状态
    } catch (error) {
      setAudioData({
        audioUrl: `http://localhost:9801/api/audio/${datasetName}/${audioId}`,
        annotationData: [],
        audioId,
        error: error.message
      });
      setHasChanges(false); // 重置修改状态
    } finally {
      setLoading(false);
    }
  }, [datasetName]);

  // 检测标注变化，变化时激活提交按钮
  useEffect(() => {
    if (!audioData || !audioData.annotationData) return;
    
    // 比较当前标注与初始标注
    const currentAnnotations = JSON.stringify(audioData.annotationData);
    const initialAnnotations = JSON.stringify(initialAnnotationsRef.current);
    
    setHasChanges(currentAnnotations !== initialAnnotations);
  }, [audioData]);

  // 表格行点击时， 播放对应区域的音频
  const handleTableRowClick = useCallback((item) => {
    if (audioWaveformRef.current) {
      audioWaveformRef.current.playRegion(item.seg[0]/1000, item.seg[1]/1000);
    }
  }, []);

  // 回调函数 高亮区域初始化
  const handleAudioReady = useCallback(() => {
    console.log('[SpeechAnno] 回调函数handleAudioReady： 音频加载完成');
    const { audioData } = stateRef.current;
    
    if (audioWaveformRef.current && audioData?.annotationData) {
      console.log(`[SpeechAnno] 初始化 ${audioData.annotationData.length} 个区域`);
      
      audioData.annotationData.forEach((item, index) => {
        audioWaveformRef.current.createRegion(
          item.start || item.seg[0]/1000,
          item.end || item.seg[1]/1000,
          item.color || 'rgba(100, 149, 237, 0.2)',
          item.id
        );
      });
    }
  }, []);

  // 波形图上添加一个区域时回调， 在标注数据中新增一个seg
  const handleRegionAdded = useCallback((region) => {
    if (region.id.startsWith('external-')) return;
    
    const newAnnotation = {
      id: region.id,
      seg: [region.start * 1000, region.end * 1000],
      start: region.start,
      end: region.end,
      text: '',
      color: region.color || 'rgba(100,149,237,0.2)'
    };
    
    console.log('[SpeechAnno] 添加区域回调 region:', newAnnotation);
    
    // 正确更新状态：使用 setAudioData
    setAudioData(prev => {
      if (!prev) return prev; // 确保prev存在
      
      const updatedAnnotations = sortAnnoByStartTime([
        ...prev.annotationData,
        newAnnotation
      ]);
      
      return {
        ...prev,
        annotationData: updatedAnnotations
      };
    });
  }, []);

  // 区域删除回调
  const handleRegionRemoved = useCallback((regionId) => {
    console.log('[SpeechAnno] 删除区域回调 regionId:', regionId);
    
    setAudioData(prev => {
      if (!prev) return prev; // 确保prev存在
      
      // 过滤掉被删除的区域
      const updatedAnnotations = prev.annotationData.filter(
        annotation => annotation.id !== regionId
      );
      
      return {
        ...prev,
        annotationData: updatedAnnotations
      };
    });
  }, []);

  // 区域更新回调
  const handleRegionUpdated = useCallback((region) => {
	
	
    console.log('[SpeechAnno] 更新区域回调 region:', region);
    
    setAudioData(prev => {
      if (!prev) return prev; // 确保prev存在
      
      // 更新对应区域的时间范围
      const updatedAnnotations = prev.annotationData.map(annotation => {
        if (annotation.id === region.id) {
          return {
            ...annotation,
            seg: [region.start * 1000, region.end * 1000],
            start: region.start,
            end: region.end
          };
        }
        return annotation;
      });
      
      return {
        ...prev,
        annotationData: sortAnnoByStartTime(updatedAnnotations)
      };
    });
  }, []);

  // 表格单元格变化处理


  const handleCellChange = useCallback((rowIndex, key, newValue) => {
    console.log("表格内容发送变化 key=", key, " row=", rowIndex, " ", newValue);
    setAudioData(prev => {
      // 1. 创建新的标注数据数组（浅拷贝）
      const newAnnotations = [...prev.annotationData];
      
      // 2. 创建新的行对象（浅拷贝+更新）
      newAnnotations[rowIndex] = {
        ...newAnnotations[rowIndex], // 复制原对象的所有属性
        [key]: newValue              // 更新指定属性的值
      };
      
      // 3. 返回新的状态对象
      return {
        ...prev,            // 复制原状态的所有属性
        annotationData: newAnnotations // 更新annotationData属性
      };
    });
  }, []);

  // 上传标注结果
  const handleUploadAnnotations = useCallback(async () => {
    if (!audioData || !hasChanges) return;
    
    setIsUploading(true);
    
    try {
      const result = await uploadAnnotations(
        audioData.audioId,
        audioData.annotationData
      );
      
      if (result.status === 'success') {
        // 更新初始标注数据
        initialAnnotationsRef.current = JSON.parse(JSON.stringify(audioData.annotationData));
        
        setSnackbar({
          open: true,
          message: '标注上传成功！',
          severity: 'success'
        });
      } else {
        throw new Error(result.message || '上传失败');
      }
    } catch (error) {
      console.error('上传标注失败:', error);
      setSnackbar({
        open: true,
        message: `上传失败: ${error.message}`,
        severity: 'error'
      });
    } finally {
      setIsUploading(false);
    }
  }, [audioData, hasChanges]);

  // 关闭消息提示
  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  return (
    <div className="app-container">
      {/* 左侧音频列表 */}
      <div className="audio-list-container">
        <div className="audio-list-header">
          音频列表
        </div>
        <AudioList datasetName={datasetName} splitName={splitName} onSelectAudio={handleSelectAudio} />
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
              onRegionAdded={handleRegionAdded}
              onRegionRemoved={handleRegionRemoved}
              onRegionUpdated={handleRegionUpdated}
              onAudioReady={handleAudioReady}
              key={audioData.audioId}
            />
          )}
        </div>
        
        {/* 标注表格区域 */}
        <div className="annotation-table-container">
          <div className="table-header">
            <div className="table-title">标注结果</div>
            {audioData && !audioData.error && (
              <Button
                variant="contained"
                color="primary"
                disabled={!hasChanges || isUploading}
                onClick={handleUploadAnnotations}
                sx={{ ml: 2 }}
              >
                {isUploading ? (
                  <>
                    <CircularProgress size={20} sx={{ mr: 1 }} />
                    上传中...
                  </>
                ) : (
                  '保存标注'
                )}
              </Button>
            )}
          </div>
          {audioData && !loading && !audioData.error && (
            <AnnoTable 
              data={audioData.annotationData} 
              columns={columns}
              activeRegionId={activeRegionId}
              onRowClick={handleTableRowClick}
              onCellChange={handleCellChange}
            />
          )}
        </div>
      </div>
      
      {/* 消息提示 */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
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

export default SpeechAnno;