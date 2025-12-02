import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, TableContainer, Paper, Table, TableHead, TableRow,
  TableCell, TableBody, CircularProgress, Alert
} from '@mui/material';
import { fetch_badcase_overview } from './utils/apiService';



const BadcaseOverview = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showKeys, setShowKeys] = useState([]);
  const [showLabels, setShowLabels] = useState([]);
  const [rows, setRows] = useState([]);
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
      const { show_keys, show_labels, show_datas } = res.data || {};
      setShowKeys(Array.isArray(show_keys) ? show_keys : []);
      setShowLabels(Array.isArray(show_labels) ? show_labels : []);
      setRows(Array.isArray(show_datas) ? show_datas : []);
      setLoading(false);
      console.log('Badcase overview data:', show_datas);
    })();
    return () => { mounted = false; };
  }, []);

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
                {showKeys.map((k, idx) => (
                  <TableCell
                    key={k}
                    sx={{
                      whiteSpace: 'nowrap',
                      maxWidth: 300,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      fontWeight: 700,
                      background: '#f5faff',
                      color: '#1976d2'
                    }}
                  >
                    {showLabels[idx] || k}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((item, idx) => {
                const audioName = item['utt'];
                return (
                  <TableRow
                    key={idx}
                    hover
                    onClick={() => {
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
                    {showKeys.map((k) => (
                      <TableCell
                        key={k}
                        sx={{
                          maxWidth: 400,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          fontSize: 15,
                          color: item[k] ? '#333' : '#bbb',
                          background: idx % 2 === 0 ? '#fafafa' : '#fff'
                        }}
                      >
                        {String(item[k] ?? '')}
                      </TableCell>
                    ))}
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
    </Box>
  );
};

export default BadcaseOverview;