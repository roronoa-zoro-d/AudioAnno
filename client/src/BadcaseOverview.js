import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, TableContainer, Paper, Table, TableHead, TableRow,
  TableCell, TableBody, CircularProgress, Alert, Dialog, DialogTitle,
  DialogContent, DialogActions, Button, List, ListItem, ListItemText,
  Divider, Chip, IconButton, Tooltip, TextField, Snackbar, Checkbox,
  FormControlLabel
} from '@mui/material';
import MuiAlert from '@mui/material/Alert';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import BarChartIcon from '@mui/icons-material/BarChart';
import FilterListIcon from '@mui/icons-material/FilterList';
import EditIcon from '@mui/icons-material/Edit';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import { fetch_badcase_overview, update_badcase_table } from './utils/apiService';



const BadcaseOverview = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showKeys, setShowKeys] = useState([]);
  const [showLabels, setShowLabels] = useState([]);
  const [rows, setRows] = useState([]);
  const [editableKeys, setEditableKeys] = useState([]); // 可编辑的列列表
  const [sortConfig, setSortConfig] = useState({
    key: null,
    direction: 'asc' // 'asc' | 'desc' | null
  });
  const [distributionDialog, setDistributionDialog] = useState({
    open: false,
    columnKey: null,
    columnLabel: null,
    distribution: []
  });
  // 筛选状态：{ columnKey: [selectedValues] }
  const [filters, setFilters] = useState({});
  const [filterDialog, setFilterDialog] = useState({
    open: false,
    columnKey: null,
    columnLabel: null,
    distribution: [],
    selectedValues: []
  });
  // 编辑状态：{ rowIndex, columnKey, value }
  const [editingCell, setEditingCell] = useState(null);
  const [editingValue, setEditingValue] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      const res = await fetch_badcase_overview();
      if (!mounted) return;
      if (!res.ok) {
        setError(res.error || '加载失败');
        setLoading(false);
        return;
      }
      const { show_keys, show_labels, show_datas, editable_keys } = res.data || {};
      setShowKeys(Array.isArray(show_keys) ? show_keys : []);
      setShowLabels(Array.isArray(show_labels) ? show_labels : []);
      setRows(Array.isArray(show_datas) ? show_datas : []);
      // 从服务端获取可编辑的列列表
      setEditableKeys(Array.isArray(editable_keys) ? editable_keys : []);
      setLoading(false);
      console.log('Badcase overview data:', show_datas);
      console.log('Editable keys:', editable_keys);
    })();
    return () => { mounted = false; };
  }, []);

  // 筛选和排序后的数据
  const filteredAndSortedRows = useMemo(() => {
    // 先应用筛选
    let filtered = rows;
    Object.entries(filters).forEach(([columnKey, selectedValues]) => {
      if (selectedValues && selectedValues.length > 0) {
        filtered = filtered.filter(row => {
          const value = String(row[columnKey] ?? '').trim();
          const displayValue = value || '(空值)';
          return selectedValues.includes(displayValue);
        });
      }
    });

    // 再应用排序
    if (!sortConfig.key) return filtered;
    
    const sorted = [...filtered].sort((a, b) => {
      const aVal = String(a[sortConfig.key] ?? '').trim();
      const bVal = String(b[sortConfig.key] ?? '').trim();
      
      // 尝试数字比较
      const aNum = parseFloat(aVal);
      const bNum = parseFloat(bVal);
      if (!isNaN(aNum) && !isNaN(bNum)) {
        return sortConfig.direction === 'asc' ? aNum - bNum : bNum - aNum;
      }
      
      // 字符串比较
      if (sortConfig.direction === 'asc') {
        return aVal.localeCompare(bVal, 'zh-CN');
      } else {
        return bVal.localeCompare(aVal, 'zh-CN');
      }
    });
    
    return sorted;
  }, [rows, sortConfig, filters]);

  // 处理排序
  const handleSort = (columnKey, e) => {
    e.stopPropagation();
    
    if (sortConfig.key === columnKey) {
      // 切换排序方向：asc -> desc -> null
      if (sortConfig.direction === 'asc') {
        setSortConfig({ key: columnKey, direction: 'desc' });
      } else if (sortConfig.direction === 'desc') {
        setSortConfig({ key: null, direction: null });
      }
    } else {
      // 新列，默认升序
      setSortConfig({ key: columnKey, direction: 'asc' });
    }
  };

  // 计算列的数据分布
  const calculateDistribution = (columnKey) => {
    const distribution = {};
    let totalCount = 0;
    
    rows.forEach((row) => {
      const value = String(row[columnKey] ?? '').trim();
      const displayValue = value || '(空值)';
      distribution[displayValue] = (distribution[displayValue] || 0) + 1;
      totalCount++;
    });

    // 转换为数组并按数量降序排序
    const distributionArray = Object.entries(distribution)
      .map(([value, count]) => ({
        value,
        count,
        percentage: totalCount > 0 ? ((count / totalCount) * 100).toFixed(2) : '0.00'
      }))
      .sort((a, b) => b.count - a.count);

    return { distribution: distributionArray, totalCount };
  };

  // 处理统计按钮点击
  const handleStatisticsClick = (columnKey, columnLabel, e) => {
    e.stopPropagation(); // 阻止事件冒泡
    const { distribution, totalCount } = calculateDistribution(columnKey);
    setDistributionDialog({
      open: true,
      columnKey,
      columnLabel,
      distribution,
      totalCount
    });
  };

  // 处理筛选按钮点击
  const handleFilterClick = (columnKey, columnLabel, e) => {
    e.stopPropagation(); // 阻止事件冒泡
    const { distribution } = calculateDistribution(columnKey);
    const currentFilter = filters[columnKey] || [];
    setFilterDialog({
      open: true,
      columnKey,
      columnLabel,
      distribution,
      selectedValues: [...currentFilter]
    });
  };

  // 处理筛选值选择
  const handleFilterValueToggle = (value) => {
    setFilterDialog(prev => {
      const selectedValues = prev.selectedValues || [];
      const newSelected = selectedValues.includes(value)
        ? selectedValues.filter(v => v !== value)
        : [...selectedValues, value];
      return { ...prev, selectedValues: newSelected };
    });
  };

  // 全选/取消全选
  const handleFilterSelectAll = () => {
    setFilterDialog(prev => {
      const allValues = prev.distribution.map(item => item.value);
      const isAllSelected = allValues.every(val => prev.selectedValues.includes(val));
      return {
        ...prev,
        selectedValues: isAllSelected ? [] : [...allValues]
      };
    });
  };

  // 应用筛选
  const handleApplyFilter = () => {
    const { columnKey, selectedValues } = filterDialog;
    // 如果筛选为空，删除该列的筛选
    if (selectedValues.length === 0) {
      setFilters(prev => {
        const newFilters = { ...prev };
        delete newFilters[columnKey];
        return newFilters;
      });
    } else {
      setFilters(prev => ({
        ...prev,
        [columnKey]: selectedValues
      }));
    }
    setFilterDialog({ open: false, columnKey: null, columnLabel: null, distribution: [], selectedValues: [] });
  };

  // 清除筛选
  const handleClearFilter = (columnKey) => {
    setFilters(prev => {
      const newFilters = { ...prev };
      delete newFilters[columnKey];
      return newFilters;
    });
  };

  // 关闭筛选对话框
  const handleCloseFilterDialog = () => {
    setFilterDialog({ open: false, columnKey: null, columnLabel: null, distribution: [], selectedValues: [] });
  };

  // 关闭对话框
  const handleCloseDialog = () => {
    setDistributionDialog({
      open: false,
      columnKey: null,
      columnLabel: null,
      distribution: [],
      totalCount: 0
    });
  };

  // 开始编辑单元格
  const handleStartEdit = (rowIndex, columnKey, currentValue, e) => {
    e.stopPropagation(); // 阻止行点击事件
    if (!editableKeys.includes(columnKey)) {
      setSnackbar({ open: true, message: '此字段不可编辑', severity: 'warning' });
      return;
    }
    setEditingCell({ rowIndex, columnKey });
    setEditingValue(String(currentValue ?? ''));
  };

  // 取消编辑
  const handleCancelEdit = (e) => {
    if (e) e.stopPropagation();
    setEditingCell(null);
    setEditingValue('');
  };

  // 保存编辑
  const handleSaveEdit = async (e) => {
    if (e) e.stopPropagation();
    if (!editingCell) return;

    const { rowIndex, columnKey } = editingCell;
    const row = filteredAndSortedRows[rowIndex];
    const utt = row['utt'];
    
    if (!utt) {
      setSnackbar({ open: true, message: '缺少音频标识，无法更新', severity: 'error' });
      handleCancelEdit();
      return;
    }

    try {
      const res = await update_badcase_table(utt, columnKey, editingValue);
      if (res.ok) {
        // 更新本地数据
        const newRows = [...rows];
        const originalIndex = rows.findIndex(r => r.utt === utt);
        if (originalIndex !== -1) {
          newRows[originalIndex] = { ...newRows[originalIndex], [columnKey]: editingValue };
          setRows(newRows);
        }
        setSnackbar({ open: true, message: '更新成功', severity: 'success' });
        handleCancelEdit();
      } else {
        setSnackbar({ open: true, message: res.error || '更新失败', severity: 'error' });
      }
    } catch (error) {
      setSnackbar({ open: true, message: '更新失败: ' + error.message, severity: 'error' });
    }
  };

  // 处理输入框按键事件
  const handleEditKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSaveEdit(e);
    } else if (e.key === 'Escape') {
      handleCancelEdit(e);
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>正在加载 Badcase 总览...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 4 }}>
        <Alert severity="error">加载失败：{error}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h5" sx={{ mb: 2, fontWeight: 700, color: '#1976d2' }}>
        Badcase 数据总览
      </Typography>
      {(!showKeys || showKeys.length === 0) ? (
        <Alert severity="info" sx={{ mt: 4, fontSize: 16 }}>
          服务端未提供要展示的字段 (show_keys)。
        </Alert>
      ) : (
        <TableContainer
          component={Paper}
          sx={{
            maxHeight: '70vh',
            boxShadow: '0 4px 16px rgba(25, 118, 210, 0.08)',
            borderRadius: 3,
            border: '1px solid #e3e3e3',
            mt: 2
          }}
        >
          <Table stickyHeader>
            <TableHead>
              <TableRow sx={{ background: '#f5faff' }}>
                <TableCell sx={{ width: 60, fontWeight: 700, background: '#f5faff', color: '#1976d2' }}>#</TableCell>
                {showKeys.map((k, idx) => {
                  const isSorted = sortConfig.key === k;
                  const sortIcon = isSorted && sortConfig.direction === 'asc' 
                    ? <ArrowUpwardIcon fontSize="small" /> 
                    : isSorted && sortConfig.direction === 'desc'
                    ? <ArrowDownwardIcon fontSize="small" />
                    : <ArrowUpwardIcon fontSize="small" sx={{ opacity: 0.3 }} />;
                  
                  return (
                    <TableCell
                      key={k}
                      sx={{
                        whiteSpace: 'nowrap',
                        maxWidth: 300,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        fontWeight: 700,
                        background: '#f5faff',
                        color: '#1976d2',
                        textAlign: 'center',
                        py: 1.5
                      }}
                    >
                      <Box
                        sx={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 0.5
                        }}
                      >
                        <Typography
                          component="span"
                          sx={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            width: '100%',
                            fontSize: '0.875rem'
                          }}
                        >
                          {showLabels[idx] || k}
                        </Typography>
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 0.5
                          }}
                        >
                          <Tooltip title="排序">
                            <IconButton
                              size="small"
                              onClick={(e) => handleSort(k, e)}
                              sx={{
                                padding: '2px',
                                color: isSorted ? '#1976d2' : '#999',
                                '&:hover': {
                                  background: 'rgba(25, 118, 210, 0.1)'
                                }
                              }}
                            >
                              {sortIcon}
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="数据分布统计">
                            <IconButton
                              size="small"
                              onClick={(e) => handleStatisticsClick(k, showLabels[idx] || k, e)}
                              sx={{
                                padding: '2px',
                                color: '#999',
                                '&:hover': {
                                  background: 'rgba(25, 118, 210, 0.1)',
                                  color: '#1976d2'
                                }
                              }}
                            >
                              <BarChartIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title={filters[k] && filters[k].length > 0 ? `筛选中 (${filters[k].length}项)` : "筛选"}>
                            <Box sx={{ position: 'relative' }}>
                              <IconButton
                                size="small"
                                onClick={(e) => handleFilterClick(k, showLabels[idx] || k, e)}
                                sx={{
                                  padding: '2px',
                                  color: filters[k] && filters[k].length > 0 ? '#ff9800' : '#999',
                                  '&:hover': {
                                    background: 'rgba(25, 118, 210, 0.1)',
                                    color: '#1976d2'
                                  }
                                }}
                              >
                                <FilterListIcon fontSize="small" />
                              </IconButton>
                              {filters[k] && filters[k].length > 0 && (
                                <Chip
                                  label={filters[k].length}
                                  size="small"
                                  sx={{
                                    position: 'absolute',
                                    top: -4,
                                    right: -4,
                                    height: 16,
                                    minWidth: 16,
                                    fontSize: '0.65rem',
                                    backgroundColor: '#ff9800',
                                    color: '#fff',
                                    '& .MuiChip-label': {
                                      padding: '0 4px'
                                    }
                                  }}
                                />
                              )}
                            </Box>
                          </Tooltip>
                        </Box>
                      </Box>
                    </TableCell>
                  );
                })}
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredAndSortedRows.map((item, idx) => {
                const audioName = item['utt'];
                return (
                  <TableRow
                    key={idx}
                    hover
                    onClick={(e) => {
                      // 如果正在编辑，不触发跳转
                      if (editingCell?.rowIndex === idx) {
                        return;
                      }
                      if (audioName) {
                        navigate(`/badcase/analysis/${encodeURIComponent(audioName)}`);
                      } else {
                        console.warn('无法获取 audioName，无法跳转：', item);
                      }
                    }}
                    sx={{
                      cursor: 'pointer',
                      transition: 'background 0.2s',
                      '&:hover': { background: '#e3f2fd' }
                    }}
                  >
                    <TableCell sx={{ fontWeight: 500, color: '#1976d2' }}>{idx + 1}</TableCell>
                    {showKeys.map((k) => {
                      const isEditing = editingCell?.rowIndex === idx && editingCell?.columnKey === k;
                      const isEditable = editableKeys.includes(k);
                      const cellValue = String(item[k] ?? '');
                      
                      return (
                        <TableCell
                          key={k}
                          onClick={(e) => {
                            if (isEditable && !isEditing) {
                              handleStartEdit(idx, k, item[k], e);
                            }
                          }}
                          sx={{
                            maxWidth: 400,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            fontSize: 15,
                            color: item[k] ? '#333' : '#bbb',
                            background: idx % 2 === 0 ? '#fafafa' : '#fff',
                            position: 'relative',
                            cursor: isEditable ? 'pointer' : 'default',
                            '&:hover': isEditable && !isEditing ? {
                              background: '#e3f2fd'
                            } : {}
                          }}
                        >
                          {isEditing ? (
                            <Box
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 0.5,
                                width: '100%'
                              }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <TextField
                                value={editingValue}
                                onChange={(e) => setEditingValue(e.target.value)}
                                onKeyDown={handleEditKeyDown}
                                size="small"
                                autoFocus
                                fullWidth
                                sx={{
                                  '& .MuiInputBase-root': {
                                    fontSize: 15,
                                    padding: '4px 8px'
                                  }
                                }}
                              />
                              <IconButton
                                size="small"
                                onClick={handleSaveEdit}
                                sx={{
                                  color: '#4caf50',
                                  padding: '4px',
                                  '&:hover': { background: 'rgba(76, 175, 80, 0.1)' }
                                }}
                              >
                                <CheckIcon fontSize="small" />
                              </IconButton>
                              <IconButton
                                size="small"
                                onClick={handleCancelEdit}
                                sx={{
                                  color: '#f44336',
                                  padding: '4px',
                                  '&:hover': { background: 'rgba(244, 67, 54, 0.1)' }
                                }}
                              >
                                <CloseIcon fontSize="small" />
                              </IconButton>
                            </Box>
                          ) : (
                            <Box
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                width: '100%'
                              }}
                            >
                              <Typography
                                component="span"
                                sx={{
                                  flex: 1,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap'
                                }}
                              >
                                {cellValue}
                              </Typography>
                              {isEditable && (
                                <EditIcon
                                  sx={{
                                    fontSize: 14,
                                    color: '#999',
                                    opacity: 0.6,
                                    ml: 0.5,
                                    flexShrink: 0
                                  }}
                                />
                              )}
                            </Box>
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                );
              })}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={1 + showKeys.length}>
                    <Typography sx={{ p: 2, color: '#888' }}>暂无数据</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      
      {/* 数据分布对话框 */}
      <Dialog
        open={distributionDialog.open}
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ 
          background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
          color: '#fff',
          fontWeight: 700,
          fontSize: 18
        }}>
          数据分布统计 - {distributionDialog.columnLabel}
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary">
              总计: <strong>{distributionDialog.totalCount || 0}</strong> 条记录
            </Typography>
          </Box>
          <Divider sx={{ mb: 2 }} />
          <List sx={{ maxHeight: 400, overflow: 'auto' }}>
            {distributionDialog.distribution.length === 0 ? (
              <ListItem>
                <ListItemText primary="暂无数据" />
              </ListItem>
            ) : (
              distributionDialog.distribution.map((item, idx) => (
                <React.Fragment key={idx}>
                  <ListItem
                    sx={{
                      py: 1.5,
                      '&:hover': {
                        background: '#f5f5f5'
                      }
                    }}
                  >
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body1" sx={{ flex: 1, wordBreak: 'break-word' }}>
                            {item.value}
                          </Typography>
                          <Chip
                            label={`${item.count} (${item.percentage}%)`}
                            color="primary"
                            size="small"
                            sx={{ fontWeight: 600 }}
                          />
                        </Box>
                      }
                    />
                  </ListItem>
                  {idx < distributionDialog.distribution.length - 1 && <Divider />}
                </React.Fragment>
              ))
            )}
          </List>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleCloseDialog} variant="contained" color="primary">
            关闭
          </Button>
        </DialogActions>
      </Dialog>

      {/* 筛选对话框 */}
      <Dialog
        open={filterDialog.open}
        onClose={handleCloseFilterDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ 
          background: 'linear-gradient(135deg, #ff9800 0%, #f57c00 100%)',
          color: '#fff',
          fontWeight: 700,
          fontSize: 18
        }}>
          筛选 - {filterDialog.columnLabel}
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              选择要显示的值（支持多选）
            </Typography>
            <Button
              size="small"
              onClick={handleFilterSelectAll}
              variant="outlined"
            >
              {filterDialog.distribution.every(item => filterDialog.selectedValues.includes(item.value))
                ? '取消全选' : '全选'}
            </Button>
          </Box>
          <Divider sx={{ mb: 2 }} />
          <List sx={{ maxHeight: 400, overflow: 'auto' }}>
            {filterDialog.distribution.length === 0 ? (
              <ListItem>
                <ListItemText primary="暂无数据" />
              </ListItem>
            ) : (
              filterDialog.distribution.map((item, idx) => {
                const isSelected = filterDialog.selectedValues.includes(item.value);
                return (
                  <React.Fragment key={idx}>
                    <ListItem
                      sx={{
                        py: 1,
                        '&:hover': {
                          background: '#f5f5f5'
                        }
                      }}
                    >
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={isSelected}
                            onChange={() => handleFilterValueToggle(item.value)}
                            color="primary"
                          />
                        }
                        label={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                            <Typography variant="body1" sx={{ flex: 1, wordBreak: 'break-word' }}>
                              {item.value}
                            </Typography>
                            <Chip
                              label={`${item.count} (${item.percentage}%)`}
                              color="primary"
                              size="small"
                              sx={{ fontWeight: 600 }}
                            />
                          </Box>
                        }
                        sx={{ width: '100%', margin: 0 }}
                      />
                    </ListItem>
                    {idx < filterDialog.distribution.length - 1 && <Divider />}
                  </React.Fragment>
                );
              })
            )}
          </List>
          {filterDialog.selectedValues.length > 0 && (
            <Box sx={{ mt: 2, p: 1, background: '#e3f2fd', borderRadius: 1 }}>
              <Typography variant="body2" color="primary">
                已选择 {filterDialog.selectedValues.length} 项
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleCloseFilterDialog}>
            取消
          </Button>
          {filters[filterDialog.columnKey] && filters[filterDialog.columnKey].length > 0 && (
            <Button
              onClick={() => {
                handleClearFilter(filterDialog.columnKey);
                handleCloseFilterDialog();
              }}
              color="warning"
            >
              清除筛选
            </Button>
          )}
          <Button onClick={handleApplyFilter} variant="contained" color="primary">
            应用筛选
          </Button>
        </DialogActions>
      </Dialog>

      {/* 消息提示 */}
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

export default BadcaseOverview;