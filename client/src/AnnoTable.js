// AnnoTable.js
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

const AnnoTable = ({ data = [], 
    columns = [],
    activeRegionId = null,
    onRowClick = () => {},
    onCellChange = () => {} // 新增
 }) => {


  // 高亮活动行
  const isActiveRow = (item) => {
    return activeRegionId && item.id === activeRegionId;
  };



  return (
    <TableContainer component={Paper} sx={{ mt: 2, maxHeight: 500 }}>
      <Table size="small" stickyHeader sx={{ tableLayout: 'auto' }} >
        <TableHead>
          <TableRow>
            {columns.map((column) => (
              <TableCell 
                key={column.key}
                sx={{ 
                  fontWeight: 'bold', 
                  backgroundColor: '#f5f5f5',
                  width: column.width || 'auto'
                }}
              >
                {column.label}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {data.length > 0 ? (
            data.map((item, idx) => (
              <TableRow key={idx} hover
                    sx={{
                        cursor: 'pointer',
                        backgroundColor: isActiveRow(item) ? '#e3f2fd' : 'inherit',
                        '&:hover': {
                            backgroundColor: isActiveRow(item) ? '#bbdefb' : '#f5f5f5'
                        }
                        }}>
                {columns.map((column, colIdx) => (
                  <TableCell key={`${column.key}-${idx}`} 
                            onClick={colIdx === 0 ? () => onRowClick(item) : undefined}>
                    
                    {column.render ? column.render(item, idx, onCellChange) : item[column.key]}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} align="center">
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

export default AnnoTable;