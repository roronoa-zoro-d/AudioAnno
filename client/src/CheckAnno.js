import React, { useState, useEffect } from 'react';
import { Box, Typography, ToggleButton, ToggleButtonGroup, CircularProgress } from '@mui/material';
import { updateCheck } from './utils/apiService';

const QC_STATUS = [
  { value: 'verified', label: '质检通过' },
  { value: 'rejected', label: '需重标' },
  { value: 'discarded', label: '音频丢弃' },
];

const SELECTED_COLOR = 'success.main';

/**
 * 质检标注组件
 * - 风格与 LabelAnno 一致
 * - 内部完成质检状态的更新
 */
const CheckAnno = ({
  datasetName,
  audioId,
  username,
  currentStatus = '',
  onStatusChange,
}) => {
  const [selected, setSelected] = useState(currentStatus || '');
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // 外部 audio 切换时同步选中状态
  useEffect(() => {
    setSelected(currentStatus || '');
    setError('');
    setSuccess('');
  }, [currentStatus, audioId]);

  const handleChange = async (event, value) => {
    if (!value || value === selected) return;
    if (!datasetName || !audioId || !username) {
      console.log('缺少必要信息，无法更新质检状态');
      return;
    }

    setUpdating(true);
    setError('');
    setSuccess('');
    try {
      await updateCheck(username, datasetName, audioId, value);
      setSelected(value);
      setSuccess('质检状态已更新');
      if (onStatusChange) {
        onStatusChange(value);
      }
    } catch (e) {
      setError('更新失败: ' + (e.message || '未知错误'));
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
        质检标注
      </Typography>
      <ToggleButtonGroup
        value={selected}
        exclusive
        onChange={handleChange}
        size="small"
        disabled={updating}
        sx={{ mb: 1 }}
      >
        {QC_STATUS.map(item => (
          <ToggleButton
            key={item.value}
            value={item.value}
            sx={{
              minWidth: 100,
              fontWeight: 500,
              color: selected === item.value ? '#fff' : undefined,
              bgcolor: selected === item.value ? SELECTED_COLOR : undefined,
              '&.Mui-selected': {
                color: '#fff',
                bgcolor: SELECTED_COLOR,
              },
            }}
          >
            {item.label}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
      <Box sx={{ minHeight: 28, mt: 1 }}>
        {updating && <CircularProgress size={18} sx={{ mr: 2 }} />}
        {error && <Typography color="error" sx={{ display: 'inline-block' }}>{error}</Typography>}
        {success && <Typography color="success.main" sx={{ display: 'inline-block' }}>{success}</Typography>}
      </Box>
    </Box>
  );
};

export default CheckAnno;


