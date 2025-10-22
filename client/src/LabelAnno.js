import React, { useEffect, useState } from 'react';
import { Box, Typography, ToggleButton, ToggleButtonGroup, CircularProgress } from '@mui/material';
import { fetchAudioLabel, updateAudioLabel } from './utils/apiService';

const SELECTED_COLOR = 'success.main'; // 与质检通过一致

const LabelAnno = ({
  datasetName,
  audioId,
  labelKey,
  labelOptions = [],
  username,
}) => {
  const [selected, setSelected] = useState('');
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // 获取当前标签
  useEffect(() => {
    if (!datasetName || !audioId || !labelKey) return;
    setLoading(true);
    setError('');
    fetchAudioLabel(datasetName, audioId)
      .then(data => {
        // data 是一个对象，如 {audio_quality: "干净", audio_emotion: "开心"}
        if (data && data[labelKey]) {
          setSelected(data[labelKey]);
        } else {
          setSelected('');
        }
      })
      .catch(e => setError('标签获取失败'))
      .finally(() => setLoading(false));
  }, [datasetName, audioId, labelKey]);

  // 标签点击
  const handleChange = async (event, value) => {
    if (!value || value === selected) return;
    setUpdating(true);
    setError('');
    setSuccess('');
    try {
      await updateAudioLabel(username, datasetName, audioId, labelKey, value);
      setSelected(value);
      setSuccess('标签已更新');
    } catch (e) {
      setError('标签更新失败');
    } finally {
      setUpdating(false);
      setTimeout(() => setSuccess(''), 2000);
    }
  };

  return (
    <Box sx={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-start',
      p: 2,
      border: '1px solid #eee',
      borderRadius: 2,
      background: '#fafbfc',
      mb: 2,
      minWidth: 260,
      maxWidth: 400,
    }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
        标签标注（{labelKey}）
      </Typography>
      {loading ? (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CircularProgress size={18} /> <Typography variant="body2">标签加载中...</Typography>
        </Box>
      ) : (
        <ToggleButtonGroup
          value={selected}
          exclusive
          onChange={handleChange}
          size="small"
          disabled={updating}
          sx={{ mb: 1 }}
        >
          {labelOptions.map(opt => (
            <ToggleButton
              key={opt}
              value={opt}
              sx={{
                minWidth: 80,
                fontWeight: 500,
                color: selected === opt ? '#fff' : undefined,
                bgcolor: selected === opt ? SELECTED_COLOR : undefined,
                '&.Mui-selected': {
                  color: '#fff',
                  bgcolor: SELECTED_COLOR,
                },
              }}
            >
              {opt}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      )}
      {updating && <CircularProgress size={18} sx={{ ml: 1 }} />}
      {error && <Typography color="error" sx={{ mt: 1 }}>{error}</Typography>}
      {success && <Typography color="success.main" sx={{ mt: 1 }}>{success}</Typography>}
    </Box>
  );
};

export default LabelAnno;