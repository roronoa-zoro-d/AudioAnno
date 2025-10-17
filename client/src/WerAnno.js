import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Checkbox,
  FormControlLabel,
  TextField,
  CircularProgress,
  Alert,
  MenuItem,
  Select,
  Chip,
  FormGroup,
} from '@mui/material';
import { API_HOST } from './utils/apiService';
import { useUser } from './UserContext';

const WerAnno = ({ datasetName, werName, audioId }) => {
  const [labels, setLabels] = useState([]);
  const [selectedLabels, setSelectedLabels] = useState([]); // 当前已选
  const [serverReason, setServerReason] = useState([]); // 服务端 reason
  const [customReason, setCustomReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const { username } = useUser();
  const [dropdownValue, setDropdownValue] = useState('');

  // 获取labels和当前标注
  useEffect(() => {
    if (!datasetName || !werName || !audioId) return;
    setLoading(true);
    setError('');
    setSuccessMsg('');
    fetch(`${API_HOST}/api/wer_anno/${datasetName}/${werName}/${audioId}`)
      .then(res => res.json())
      .then(data => {
        setLabels(data.labels || []);
        setServerReason(data.reason || []);
        setSelectedLabels(data.reason || []);
        setCustomReason('');
      })
      .catch(() => setError('获取标签失败'))
      .finally(() => setLoading(false));
  }, [datasetName, werName, audioId]);

  // 选择/取消选择label
  const handleLabelChange = (label) => {
    setSelectedLabels(prev =>
      prev.includes(label)
        ? prev.filter(l => l !== label)
        : [...prev, label]
    );
  };

  // 下拉选择
  const handleDropdownChange = (e) => {
    const value = e.target.value;
    setDropdownValue('');
    if (value && !selectedLabels.includes(value)) {
      setSelectedLabels(prev => [...prev, value]);
    }
  };

  // 提交
  const handleSubmit = async () => {
    setSubmitLoading(true);
    setError('');
    setSuccessMsg('');
    try {
      let reason_list = [...selectedLabels];
      if (customReason.trim()) {
        reason_list.push(customReason.trim());
      }
      const res = await fetch(`${API_HOST}/api/update_wer_anno`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username,
          dataset_name: datasetName,
          wer_name: werName,
          utt: audioId,
          reasons: reason_list,
        }),
      });
      if (!res.ok) throw new Error('提交失败');
      setSuccessMsg('提交成功');
    } catch (e) {
      setError(e.message || '提交失败');
    } finally {
      setSubmitLoading(false);
    }
  };

  // 前5个标签
  const firstLabels = labels.slice(0, 5);
  // 剩余标签
  const restLabels = labels.slice(5);

  // 当前已选和自定义原因
  const currentReasons = [
    ...selectedLabels,
    ...(customReason.trim() ? [customReason.trim()] : [])
  ];

  return (
    <Box sx={{ p: 1.5, border: '1px solid #eee', borderRadius: 2, background: '#fafbfc' }}>
      {/* 标题 + 提交按钮行 */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>
          模型识别错误原因标注
        </Typography>
        <Button
          variant="contained"
          size="small"
          onClick={handleSubmit}
          disabled={submitLoading || loading}
        >
          {submitLoading ? '提交中...' : '提交'}
        </Button>
      </Box>
      {loading ? (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CircularProgress size={18} /> <Typography variant="body2">加载中...</Typography>
        </Box>
      ) : (
        <>
          {/* 第一行：服务端labels（滚动一行） */}
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Typography variant="body2" sx={{ mr: 1, whiteSpace: 'nowrap' }}>
                请选择可能的原因:
              </Typography>
              <FormGroup
                row
                sx={{
                  flexWrap: 'nowrap',
                  overflowX: 'auto',
                  maxWidth: '100%',
                  mb: 0,
                }}
              >
                {firstLabels.map(label => (
                  <FormControlLabel
                    key={label}
                    control={
                      <Checkbox
                        size="small"
                        checked={selectedLabels.includes(label)}
                        onChange={() => handleLabelChange(label)}
                      />
                    }
                    label={<Typography variant="caption">{label}</Typography>}
                    sx={{ mr: 1, whiteSpace: 'nowrap' }}
                  />
                ))}
                {restLabels.length > 0 && (
                  <Select
                    value={dropdownValue}
                    displayEmpty
                    onChange={handleDropdownChange}
                    size="small"
                    sx={{ minWidth: 110, ml: 1 }}
                    renderValue={selected => selected || '更多'}
                  >
                    <MenuItem value="" disabled>更多</MenuItem>
                    {restLabels.map(label => (
                      <MenuItem key={label} value={label} disabled={selectedLabels.includes(label)}>
                        {label}
                      </MenuItem>
                    ))}
                  </Select>
                )}
              </FormGroup>
            </Box>
          {/* 第二行：单行自定义原因 */}
          <TextField
            label="其他原因(可选)"
            value={customReason}
            onChange={e => setCustomReason(e.target.value)}
            fullWidth
            size="small"
            sx={{ mb: 1 }}
            placeholder="输入原因后即可被提交"
          />
          {/* 第三行：已选择/填写的原因 */}
          {currentReasons.length > 0 && (
            <Box sx={{ mb: 1, display: 'flex', alignItems: 'flex-start' }}>
              <Typography variant="body2" sx={{ mr: 1, whiteSpace: 'nowrap', mt: 0.2 }}>
                已选择:
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {currentReasons.map((reason, idx) => (
                  <Chip
                    key={reason + idx}
                    label={reason}
                    size="small"
                    onDelete={() => {
                      // 仅删除已选标签（自定义原因在输入框修改/清空）
                      if (selectedLabels.includes(reason)) {
                        setSelectedLabels(prev => prev.filter(r => r !== reason));
                      } else if (customReason.trim() === reason) {
                        setCustomReason('');
                      }
                    }}
                  />
                ))}
              </Box>
            </Box>
          )}
          {error && <Alert severity="error" sx={{ mb: 1 }}>{error}</Alert>}
          {successMsg && <Alert severity="success" sx={{ mb: 1 }}>{successMsg}</Alert>}
        </>
      )}
    </Box>
  );
};

export default WerAnno;