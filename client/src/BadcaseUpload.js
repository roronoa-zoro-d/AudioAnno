import React, { useState, useRef } from 'react';
import { Box, TextField, Button, Typography, MenuItem, Dialog, Stack } from '@mui/material';
import { upload_badcase } from './utils/apiService';
import { PROBLEM_TYPES, ENV_OPTIONS } from './BadcaseConfig';

// const PROBLEM_TYPES = [
//   '转写错误',
//   '漏转写',
//   'vad错误',
//   '其他',
// ];

// const ENV_OPTIONS = [
//   { value: 'prod', label: '生产环境' },
//   { value: 'test', label: '测试环境' },
// ];

const BadcaseUpload = () => {
  const [desc, setDesc] = useState('');
  const [imgFile, setImgFile] = useState(null);
  const [audioFile, setAudioFile] = useState(null);
  const [audioName, setAudioName] = useState('');
  const [audioUrl, setAudioUrl] = useState('');
  const [date, setDate] = useState(() => {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  });
  const [problemType, setProblemType] = useState('');
  const [env, setEnv] = useState(ENV_OPTIONS[0]); // 默认选第一个中文
  const [user, setUser] = useState('');
  const [remark, setRemark] = useState('');
  const [imgPreviewUrl, setImgPreviewUrl] = useState('');
  const [imgDialogOpen, setImgDialogOpen] = useState(false);
  const imgInputRef = useRef();
  const [feedback, setFeedback] = useState('');
  const [uploadStatus, setUploadStatus] = useState('');

  // 自动获取音频名和预览
  const handleAudioChange = (e) => {
    const file = e.target.files[0];
    setAudioFile(file);
    setAudioName(file ? file.name : '');
    setAudioUrl(file ? URL.createObjectURL(file) : '');
  };

  // 拖拽上传音频
  const handleAudioDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('audio/')) {
      setAudioFile(file);
      setAudioName(file.name);
      setAudioUrl(URL.createObjectURL(file));
    }
  };

  // 拖拽上传图片
  const handleImgDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      setImgFile(file);
      setImgPreviewUrl(URL.createObjectURL(file));
    }
  };

  // 图片变化处理
  const handleImgChange = (e) => {
    const file = e.target.files[0];
    setImgFile(file);
    if (file) {
      setImgPreviewUrl(URL.createObjectURL(file));
    } else {
      setImgPreviewUrl('');
    }
  };

  // 支持截图粘贴
  const handleImgPaste = (e) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        setImgFile(file);
        setImgPreviewUrl(URL.createObjectURL(file));
        break;
      }
    }
  };

  const handleUpload = async () => {
    const formData = new FormData();
    formData.append('env', env); // 上传中文
    formData.append('user', user);
    formData.append('date', date);
    formData.append('problemType', problemType);
    formData.append('audioName', audioName);
    formData.append('desc', desc);
    formData.append('remark', remark);
    if (audioFile) formData.append('audio', audioFile);
    if (imgFile) formData.append('image', imgFile);

    setUploadStatus(''); // 清空状态
    const success = await upload_badcase(formData);
    setUploadStatus(success ? '上传成功' : '上传失败');
  };

  return (
    <Box sx={{
      maxWidth: 800,
      margin: '40px auto',
      padding: 4,
      background: '#fafbfc',
      borderRadius: 3,
      boxShadow: 1,
      border: '1px solid #eee'
    }}>
      <Typography variant="h5" sx={{ mb: 2, fontWeight: 600 }}>
        Badcase数据上传
      </Typography>
      <Stack spacing={2}>
        {/* 第一行：环境选项，反馈人，反馈日期 */}
        <Stack direction="row" spacing={2}>
          <TextField
            label="环境选项"
            select
            sx={{ flex: 1 }}
            value={env}
            onChange={e => setEnv(e.target.value)}
          >
            {ENV_OPTIONS.map(opt => (
              <MenuItem key={opt} value={opt}>{opt}</MenuItem>
            ))}
          </TextField>
          <TextField
            label="反馈人"
            sx={{ flex: 1 }}
            value={user}
            onChange={e => setUser(e.target.value)}
          />
          <TextField
            label="反馈日期"
            type="date"
            sx={{ flex: 1 }}
            value={date}
            onChange={e => setDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
        </Stack>
        {/* 第二行：反馈问题类型，音频名 */}
        <Stack direction="row" spacing={2}>
            <TextField
            label="反馈问题类型"
            select
            sx={{ flex: 1 }}
            value={problemType}
            onChange={e => setProblemType(e.target.value)}
            InputLabelProps={{ shrink: true }} // 修复重叠
            SelectProps={{
                displayEmpty: true,
                MenuProps: {
                PaperProps: {
                    style: {
                    maxHeight: 240,
                    minWidth: 180,
                    },
                },
                },
            }}
            >
            <MenuItem value="" disabled>
              请选择类型
            </MenuItem>
            {PROBLEM_TYPES.map(type => (
              <MenuItem key={type} value={type}>{type}</MenuItem>
            ))}
          </TextField>
          <TextField
            label="音频名"
            sx={{ flex: 1 }}
            value={audioName}
            InputProps={{ readOnly: true }}
          />
        </Stack>
        {/* 第三行：问题描述 */}
        <TextField
          label="问题描述"
          fullWidth
          multiline
          minRows={2}
          value={desc}
          onChange={e => setDesc(e.target.value)}
        />
        {/* 第四行：备注 */}
        <TextField
          label="备注"
          fullWidth
          multiline
          minRows={2}
          value={remark}
          onChange={e => setRemark(e.target.value)}
        />
        {/* 第五行：音频，截图 */}
        <Stack direction="row" spacing={2}>
          <Box
            sx={{
              flex: 1,
              border: '1px dashed #bbb',
              borderRadius: 2,
              p: 2,
              textAlign: 'center',
              background: '#f5f5f5',
              cursor: 'pointer'
            }}
            onDragOver={e => e.preventDefault()}
            onDrop={handleAudioDrop}
          >
            <Typography variant="body2" sx={{ mb: 1 }}>音频文件上传（可拖拽）</Typography>
            <input
              type="file"
              accept="audio/*"
              style={{ display: 'none' }}
              id="audio-upload"
              onChange={handleAudioChange}
            />
            <label htmlFor="audio-upload">
              <Button variant="outlined" component="span" size="small">选择音频</Button>
            </label>
            {audioUrl && (
              <Box sx={{ mt: 2 }}>
                <audio src={audioUrl} controls style={{ width: '100%' }} />
              </Box>
            )}
          </Box>
          <Box
            sx={{
              flex: 1,
              border: '1px dashed #bbb',
              borderRadius: 2,
              p: 2,
              textAlign: 'center',
              background: '#f5f5f5',
              cursor: 'pointer'
            }}
            onDragOver={e => e.preventDefault()}
            onDrop={handleImgDrop}
            onPaste={handleImgPaste}
            tabIndex={0}
          >
            <Typography variant="body2" sx={{ mb: 1 }}>截图上传（可拖拽/粘贴）</Typography>
            <input
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              id="img-upload"
              ref={imgInputRef}
              onChange={handleImgChange}
            />
            <label htmlFor="img-upload">
              <Button variant="outlined" component="span" size="small">选择图片</Button>
            </label>
            {imgFile && <Typography variant="caption" sx={{ ml: 2 }}>{imgFile.name}</Typography>}
            {imgPreviewUrl && (
              <Box sx={{ mt: 2 }}>
                <img
                  src={imgPreviewUrl}
                  alt="预览"
                  style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 4, cursor: 'pointer', border: '1px solid #ccc' }}
                  onClick={() => setImgDialogOpen(true)}
                />
              </Box>
            )}
            <Dialog open={imgDialogOpen} onClose={() => setImgDialogOpen(false)}>
              <Box sx={{ p: 2 }}>
                <img src={imgPreviewUrl} alt="大图预览" style={{ maxWidth: 500, maxHeight: 500 }} />
              </Box>
            </Dialog>
          </Box>
        </Stack>
        {/* 第六行：上传按钮，右下角 */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
          {uploadStatus && (
            <Typography sx={{ mr: 2 }} color={uploadStatus === '上传成功' ? 'success.main' : 'error'}>
              {uploadStatus}
            </Typography>
          )}
          <Button
            variant="contained"
            color="primary"
            sx={{ mt: 2 }}
            onClick={handleUpload}
            disabled={!env || !user || !date || !problemType || !audioName}
          >
            上传
          </Button>
        </Box>
      </Stack>
    </Box>
  );
};

export default BadcaseUpload;