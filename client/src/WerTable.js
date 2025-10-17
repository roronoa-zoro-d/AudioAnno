import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
} from '@mui/material';

const formatTime = (ms) => (ms / 1000).toFixed(2);

const WerTable = ({ data = [], onTimeClick = () => {} }) => {
  // 计算每个合并区域需要的最大行数
  const getMaxRows = (item) => Math.max(item.ref_segs.length, item.asr_segs.length) || 1;

  // 点击时间戳cell时的处理
  const handleTimeClick = (start, end, e) => {
    e.stopPropagation();
    if (typeof start === 'number' && typeof end === 'number') {
      onTimeClick(start / 1000, end / 1000); // 传秒
    }
  };

  return (
    <TableContainer component={Paper} sx={{ mt: 2, maxHeight: 500, overflow: 'auto' }}>
      <Table size="small" sx={{ tableLayout: 'auto', minWidth: 900 }}>
        <TableHead>
          <TableRow>
            <TableCell
              align="center"
              rowSpan={2}
              sx={{
                fontWeight: 'bold',
                backgroundColor: '#f5f5f5',
                borderRight: '2px solid #222',
                borderBottom: '2px solid #222',
                width: 120,
                minWidth: 90,
                zIndex: 1,
              }}
            >
              合并区域
            </TableCell>
            <TableCell
              align="center"
              colSpan={2}
              sx={{
                fontWeight: 'bold',
                backgroundColor: '#f5f5f5',
                borderRight: '2px solid #222',
                borderBottom: '2px solid #222',
              }}
            >
              标注结果
            </TableCell>
            <TableCell
              align="center"
              colSpan={2}
              sx={{
                fontWeight: 'bold',
                backgroundColor: '#f5f5f5',
                borderBottom: '2px solid #222',
              }}
            >
              模型结果
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell
              align="center"
              sx={{
                fontWeight: 'bold',
                backgroundColor: '#f5f5f5',
                borderRight: '1px solid #888',
                borderBottom: '2px solid #222',
                width: 110,
                minWidth: 90,
              }}
            >
              时间戳
            </TableCell>
            <TableCell
              align="center"
              sx={{
                fontWeight: 'bold',
                backgroundColor: '#f5f5f5',
                borderRight: '2px solid #222',
                borderBottom: '2px solid #222',
                width: 140,
                minWidth: 100,
              }}
            >
              文本
            </TableCell>
            <TableCell
              align="center"
              sx={{
                fontWeight: 'bold',
                backgroundColor: '#f5f5f5',
                borderRight: '1px solid #888',
                borderBottom: '2px solid #222',
                width: 110,
                minWidth: 90,
              }}
            >
              时间戳
            </TableCell>
            <TableCell
              align="center"
              sx={{
                fontWeight: 'bold',
                backgroundColor: '#f5f5f5',
                borderBottom: '2px solid #222',
                width: 140,
                minWidth: 100,
              }}
            >
              文本
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {data.length > 0 ? (
            data.map((item, idx) => {
              const maxRows = getMaxRows(item);
              const refSegs = item.ref_segs;
              const asrSegs = item.asr_segs;
              return Array.from({ length: maxRows }).map((_, rowIdx) => (
                <TableRow key={idx + '-' + rowIdx}>
                  {/* 合并区域只在第一行显示，合并单元格 */}
                  {rowIdx === 0 && (
                    <TableCell
                      rowSpan={maxRows}
                      align="center"
                      sx={{
                        borderRight: '2px solid #222',
                        fontWeight: 600,
                        fontSize: 14,
                        background: '#f9fbe7',
                        zIndex: 1,
                      }}
                    >
                      {formatTime(item.merged_seg[0])}~{formatTime(item.merged_seg[1])}
                    </TableCell>
                  )}
                  {/* 标注分段-时间戳 */}
                  <TableCell
                    align="center"
                    sx={{
                      borderRight: '1px solid #888',
                      fontSize: 13,
                      width: 110,
                      minWidth: 90,
                      cursor: refSegs[rowIdx] ? 'pointer' : 'default',
                      color: refSegs[rowIdx] ? '#1976d2' : undefined,
                      textDecoration: refSegs[rowIdx] ? 'underline' : undefined,
                    }}
                    onClick={
                      refSegs[rowIdx]
                        ? (e) => handleTimeClick(refSegs[rowIdx].seg[0], refSegs[rowIdx].seg[1], e)
                        : undefined
                    }
                  >
                    {refSegs[rowIdx]
                      ? `${formatTime(refSegs[rowIdx].seg[0])}~${formatTime(refSegs[rowIdx].seg[1])}`
                      : ''}
                  </TableCell>
                  {/* 标注分段-文本 */}
                  <TableCell
                    align="left"
                    sx={{
                      borderRight: '2px solid #222',
                      fontSize: 13,
                      width: 140,
                      minWidth: 100,
                    }}
                  >
                    {refSegs[rowIdx] ? refSegs[rowIdx].text : ''}
                  </TableCell>
                  {/* 识别分段-时间戳 */}
                  <TableCell
                    align="center"
                    sx={{
                      borderRight: '1px solid #888',
                      fontSize: 13,
                      width: 110,
                      minWidth: 90,
                      cursor: asrSegs[rowIdx] ? 'pointer' : 'default',
                      color: asrSegs[rowIdx] ? '#388e3c' : undefined,
                      textDecoration: asrSegs[rowIdx] ? 'underline' : undefined,
                    }}
                    onClick={
                      asrSegs[rowIdx]
                        ? (e) => handleTimeClick(asrSegs[rowIdx].seg[0], asrSegs[rowIdx].seg[1], e)
                        : undefined
                    }
                  >
                    {asrSegs[rowIdx]
                      ? `${formatTime(asrSegs[rowIdx].seg[0])}~${formatTime(asrSegs[rowIdx].seg[1])}`
                      : ''}
                  </TableCell>
                  {/* 识别分段-文本 */}
                  <TableCell
                    align="left"
                    sx={{
                      fontSize: 13,
                      width: 140,
                      minWidth: 100,
                    }}
                  >
                    {asrSegs[rowIdx] ? asrSegs[rowIdx].text : ''}
                  </TableCell>
                </TableRow>
              ));
            })
          ) : (
            <TableRow>
              <TableCell colSpan={5} align="center">
                <Typography variant="body2" color="textSecondary">
                  暂无数据
                </Typography>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default WerTable;