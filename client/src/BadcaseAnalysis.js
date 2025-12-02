import React, { useEffect, useState, useCallback,  useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Box, Typography, CircularProgress, Alert, Dialog, Snackbar } from '@mui/material';
import { FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import { ToggleButton, ToggleButtonGroup } from '@mui/material';
import MuiAlert from '@mui/material/Alert';

import { fetch_badcase_detail, API_HOST, compareSegments, update_badcase } from './utils/apiService';
import AudioWaveform from './AudioWaveform';
// import { getColumnsByParams } from './tableColumns';
import WerTable from './WerTable'; // 新增导入
import {PROBLEM_TYPES, SOLVE_OPTIONS} from './BadcaseConfig'

// const SOLVE_OPTIONS = [
//   { value: 'solved', label: '已解决' },
//   { value: 'unsolved', label: '未解决' },
//   { value: 'partial', label: '解决部分' },
// ];

// const PROBLEM_TYPES = [
//   '语音识别错误',
//   '语音漏识别',
//   'vad漏切分-语音概率低',
//   'vad漏切分-切分规则',
// ];

const BadcaseAnalysis = () => {
  const { audioName } = useParams(); // 路由参数
  const [loading, setLoading] = useState(true);
  const [audioData, setAudioData] = useState(null);
  const [error, setError] = useState('');
  const [audioUrl, setAudioUrl] = useState('');
  const [imgUrl, setImgUrl] = useState('');
  const [imgDialogOpen, setImgDialogOpen] = useState(false);
  const [minPxPerSec, setMinPxPerSec] = useState(0);
  const audioWaveformRef = useRef(null);

  // 新增：存放从 audioData 中解析出来的注释数据（供 AnnoTable 使用）
  const [annoData, setAnnoData] = useState([]);
//   const [activeRegionId, setActiveRegionId] = useState(null);


  // 模型名称列表及当前选择的模型
  const [modelNames, setModelNames] = useState([]);
  const curModelNameRef = useRef('');
  const modelAnnoCompareDataRef = useRef(null); // 新增：模型结果对比结果

  // 标签
  const [solveStatus, setSolveStatus] = useState();
  const [problemType, setProblemType] = useState();

//   const columns = getColumnsByParams([['index', 'timeRange', 'textEdit'],[]]);

  // 解析 model_annos，设置 models 列表并返回原始 model objects 列表
  const parseModelAnnos = useCallback((data) => {
    const list = Array.isArray(data?.model_annos) ? data.model_annos : [];
    const names = list.map((m, i) => m?.model_name ?? `model_${i}`);
    setModelNames(names);
    // 默认选第一个，若已有选择且仍在 names 中则保留
    const curName = curModelNameRef.current && names.includes(curModelNameRef.current)
      ? curModelNameRef.current
      : (names[0] ?? '');
    curModelNameRef.current = curName;
    return list;
  }, []);

  // 获取 badcase 数据详情
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!audioName) {
        setError('缺少 audioName 参数');
        setLoading(false);
        return;
      }
      setLoading(true);
      const res = await fetch_badcase_detail(decodeURIComponent(audioName));
      if (!mounted) return;
      if (!res.ok) {
        setError(res.error || '获取详情失败');
        setLoading(false);
        return;
      }

      setAudioData(res.data);

      // 解析 audio url（保持原逻辑）
      setAudioUrl(`${API_HOST}/api/badcase_audio/${encodeURIComponent(audioName)}`);
      setImgUrl(`${API_HOST}/api/badcase_image/${audioName}`);


      // 标注数据
      const segs = res.data?.ref_anno?.seg_datas || [];
      setAnnoData(add_seg_key(segs));

      // 解析模型并设置当前模型结果
      const modelList = parseModelAnnos(res.data);

      // 新增：初次设置时调用 compareSegments 并设置 modelAnnoCompareDataRef
      try {
        const modelAnnoData = getModelAnnoDataByName(res.data, curModelNameRef.current);
        const compareResult = await compareSegments(segs, modelAnnoData);
        modelAnnoCompareDataRef.current = compareResult;
        console.log('模型结果对比:', compareResult);
      } catch (e) {
        modelAnnoCompareDataRef.current = null;
        console.error('compareSegments error', e);
      }

    // 新增：如果有问题类型，直接设置
    if (res.data.problemType) {
        setProblemType(res.data.problemType);
    }
    // 根据模型结果，设置解决状态
    const curModel = res.data.model_annos?.find(m => m.model_name === curModelNameRef.current);
    if (curModel && curModel.anno_label && curModel.anno_label.solve_status) {
        setSolveStatus(curModel.anno_label.solve_status);
    }


    //   console.log('Badcase audioData for', audioName, res.data);
    //   console.log('Audio URL (used):', audioUrl, 'Image URL (used):', imgUrl);

      setLoading(false);
    })();
    return () => { mounted = false; };
  }, [audioName]);

  // 

  // 波形图回调函数1  加载音频后，初始化高亮区域初
  const handleAudioReady = useCallback(() => {
    if (audioWaveformRef.current && annoData) {
    
        annoData.forEach((item, index) => {
            audioWaveformRef.current.createRegion(
            item.start || item.seg[0] / 1000,
            item.end || item.seg[1] / 1000,
            item.color || 'rgba(100, 149, 237, 0.2)',
            item.id
            );
        });

        const modelSegs = getModelAnnoDataByName(audioData, curModelNameRef.current);
        const model_anno_segs = add_seg_key(modelSegs);
        model_anno_segs.forEach(item => {
            audioWaveformRef.current.createRegion(
            item.start,
            item.end,
            item.color || 'rgba(255, 140, 0, 0.2)', // 可自定义模型高亮颜色
            item.id
            );
  });

    }
  }, [annoData]);


    // 当用户切换模型
  const handleModelChange = async (event) => {
    const name = event.target.value;
    curModelNameRef.current = name;
    if (audioData && Array.isArray(audioData.model_annos)) {
      const modelAnnoData = getModelAnnoDataByName(audioData, name);

      // 新增：调用 compareSegments 获取对比结果并存入 ref
      try {
        const compareResult = await compareSegments(annoData, modelAnnoData);
        modelAnnoCompareDataRef.current = compareResult;
        console.log('模型结果对比:', compareResult);
      } catch (e) {
        modelAnnoCompareDataRef.current = null;
        console.error('compareSegments error', e);
      }
    } else {
      modelAnnoCompareDataRef.current = null;
    }
    // 强制刷新页面
    forceUpdate();
  };

  // 表格时间戳点击：播放对应区域
  const handleTableTimeClick = useCallback((start, end) => {
    if (audioWaveformRef.current) {
      audioWaveformRef.current.playRegion(start, end);
    }
  }, []);


  // 强制刷新组件（因为 ref 更新不会自动 re-render）
  const [, setDummy] = useState(0);
  const forceUpdate = () => setDummy(d => d + 1);

  // 上传标注处理函数
  const handleUploadBadcase = async () => {
    const payload = {
      utt: audioName,
      modelName: curModelNameRef.current,
      solveStatus,      // 直接上传中文
      problemType,      // 直接上传中文
    };
    try {
      const res = await update_badcase(payload);
      if (res.status === 'success') {
        setSnackbar({ open: true, message: '上传成功', severity: 'success' });
      } else {
        setSnackbar({ open: true, message: '上传失败', severity: 'error' });
      }
    } catch (e) {
      setSnackbar({ open: true, message: '上传失败', severity: 'error' });
    }
  };

  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });

  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>Badcase 分析 — {audioName}</Typography>
      {loading && <CircularProgress />}
      {!loading && error && <Alert severity="error">{error}</Alert>}
      {!loading && !error && (
        <Box>
          <Typography variant="body2" sx={{ mb: 1 }}>已在控制台打印详情信息。</Typography>

          {/* 波形密度滑动条 */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Typography variant="body2" sx={{ minWidth: 140 }}>波形密度 (minPxPerSec):</Typography>
            <input
              type="range"
              min={0}
              max={50}
              step={10}
              value={minPxPerSec}
              onChange={e => setMinPxPerSec(Number(e.target.value))}
              style={{ width: 160 }}
            />
            <span style={{ fontSize: 13, color: '#888' }}>{minPxPerSec}</span>
          </Box>

          {/* 波形展示 */}
          {audioUrl ? (
            <Box sx={{ mb: 3 }}>
              <AudioWaveform
                ref={audioWaveformRef}
                audioUrl={audioUrl}
                onAudioReady={handleAudioReady}
                key={audioName}
                {...(minPxPerSec > 0 ? { minPxPerSec } : {})}
              />
            </Box>
          ) : (
            <Alert severity="info" sx={{ mb: 3 }}>未找到可播放的音频地址。</Alert>
          )}

          {/* 优化：截图和标注内容并排，按钮紧跟描述 */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 4,
              mb: 3,
              minHeight: 360,
              width: '100%',
              flexWrap: { xs: 'wrap', md: 'nowrap' } // 小屏换行，大屏并排
            }}
          >
            {/* 左侧截图区域 */}
            <Box
              sx={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'flex-start',
                minWidth: 260,
                width: '100%',
                height: '100%' // 新增
              }}
            >
              {imgUrl ? (
                <>
                  <Typography variant="body2" sx={{ mb: 1 }}>截图预览：</Typography>
                  <img
                    src={imgUrl}
                    alt="截图预览"
                    style={{
                      width: '100%',
                      height: '100%', // 新增
                      objectFit: 'contain', // 保证图片完整显示
                      borderRadius: 8,
                      cursor: 'pointer',
                      border: '1px solid #ccc',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
                    }}
                    onClick={() => setImgDialogOpen(true)}
                  />
                  <Dialog open={imgDialogOpen} onClose={() => setImgDialogOpen(false)}>
                    <Box sx={{ p: 2 }}>
                      <img src={imgUrl} alt="大图预览" style={{ maxWidth: '80vw', maxHeight: '80vh' }} />
                    </Box>
                  </Dialog>
                </>
              ) : (
                <Box sx={{ width: '100%', minHeight: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#aaa', border: '1px dashed #ccc', borderRadius: 8 }}>
                  暂无截图
                </Box>
              )}
            </Box>

            {/* 右侧标注区域 */}
            <Box
              sx={{
                flex: 1,
                minWidth: 320,
                width: '100%'
              }}
            >
              {/* 模型选择 */}
              {modelNames.length > 0 && (
                <FormControl sx={{ mb: 2, minWidth: 240 }}>
                  <InputLabel id="model-select-label">选择模型结果</InputLabel>
                  <Select
                    labelId="model-select-label"
                    value={curModelNameRef.current}
                    label="选择模型结果"
                    onChange={handleModelChange}
                    size="small"
                  >
                    {modelNames.map((m) => (
                      <MenuItem key={m} value={m}>{m}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}

              {/* 问题状态 */}
              <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography variant="body2" sx={{ minWidth: 90 }}>问题状态：</Typography>
                <ToggleButtonGroup
                  value={solveStatus}
                  exclusive
                  onChange={(_, v) => v && setSolveStatus(v)}
                  size="small"
                >
                  {SOLVE_OPTIONS.map(opt => (
                    <ToggleButton key={opt} value={opt}>
                      {opt}
                    </ToggleButton>
                  ))}
                </ToggleButtonGroup>
              </Box>

              {/* 问题分类 */}
              <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography variant="body2" sx={{ minWidth: 90 }}>问题分类：</Typography>
                <ToggleButtonGroup
                  value={problemType}
                  exclusive
                  onChange={(_, v) => v && setProblemType(v)}
                  size="small"
                >
                  {PROBLEM_TYPES.map(type => (
                    <ToggleButton key={type} value={type}>
                      {type}
                    </ToggleButton>
                  ))}
                </ToggleButtonGroup>
              </Box>

              {/* 问题描述框 */}
              {audioData?.desc && (
                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, mr: 1, minWidth: 90 }}>问题描述：</Typography>
                    <Box sx={{
                      background: '#f5f5f5',
                      borderRadius: 4,
                      padding: 2,
                      fontSize: 15,
                      color: '#333',
                      whiteSpace: 'pre-wrap',
                      display: 'inline-block',
                      flex: 1
                    }}>
                      {audioData.desc}
                    </Box>
                  </Box>
                  <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-start' }}>
                    <button
                      style={{
                        padding: '8px 24px',
                        background: '#1976d2',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 4,
                        cursor: 'pointer',
                        fontSize: 16,
                        height: '40px'
                      }}
                      onClick={handleUploadBadcase}
                    >
                      上传标注
                    </button>
                  </Box>
                </Box>
              )}
            </Box>
          </Box>

          {/* WER分段对比表 */}
          <div className="annotation-table-container" style={{ marginTop: 32 }}>
            {/* <div className="table-header">
              <div className="table-title">WER分段对比表</div>
            </div> */}
            <WerTable data={modelAnnoCompareDataRef.current?.merged_segs} onTimeClick={handleTableTimeClick} />
          </div>

          <pre style={{ whiteSpace: 'pre-wrap', maxHeight: 400, overflow: 'auto' }}>
            {JSON.stringify(audioData, null, 2)}
          </pre>
        </Box>
      )}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <MuiAlert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </MuiAlert>
      </Snackbar>
    </Box>
  );
};

export default BadcaseAnalysis;

function add_seg_key(segs) {
  return (Array.isArray(segs) ? segs : []).map(item => ({
    ...item,
    id: item.id || `external-anno-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    start: item.seg[0] / 1000,
    end: item.seg[1] / 1000
  })).sort((a, b) => a.seg[0] - b.seg[0]);
}

// 根据模型名称获取对应的模型分段数据
function getModelAnnoDataByName(audioData, modelName) {
  if (!audioData || !Array.isArray(audioData.model_annos)) return [];
  const curModel = audioData.model_annos.find(m => m.model_name === modelName);
  const segs = curModel?.seg_datas || [];
  return add_seg_key(segs);
}