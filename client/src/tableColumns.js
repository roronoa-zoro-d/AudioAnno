import { 
  Box, 
  Chip, 
  Typography, 
  RadioGroup, 
  FormControlLabel, 
  TextField,
  Radio 
} from '@mui/material';  // 缺少导入 Radio 相关组件

// 格式化工具函数
const formatTime = (ms) => (ms / 1000).toFixed(2) + 's';
const formatTimeRange = (start, end) => `${formatTime(start)} - ${formatTime(end)}`;


// /​**​
//  * 通用单选列配置生成器
//  * @param {string} key - 数据字段键名
//  * @param {string} label - 列标题
//  * @param {number} width - 列宽度百分比
//  * @param {Array} options - 选项配置数组
//  * @param {string} defaultValue - 默认选中值
//  * @returns {Object} 列配置对象
//  */
const createRadioColumn = (key, label, options) => {
  return {
    key,
    label,
    render: (item, rowIndex, onCellChange) => {
     
      return (
        <RadioGroup 
          onChange={(e) => {onCellChange(rowIndex, key, e.target.value);}}
          row
          sx={{
            justifyContent: 'center',
            alignItems: 'center',
            height: '100%',
            '& .MuiFormControlLabel-root': {
              marginLeft: 0,
              marginRight: '8px'
            }
          }}
        >
          {options.map((option) => (
            <FormControlLabel 
              key={option}
              value={option}
              control={<Radio size="small" color={'primary'} />} 
              label={option}
              sx={{
                '& .MuiTypography-root': {
                  fontSize: '0.875rem'
                }
              }}
            />
          ))}
        </RadioGroup>
      );
    }
  };
};







const indexColumn = {
  key: 'index',
  label: '序号',
  width: '5%',
  render: (_, idx) => (
    <Chip 
      label={idx + 1} 
      size="small" 
      color="primary" 
      variant="outlined"
    />
  )
};

const segmentColumn = {
  key: 'timeRange',
  label: '时间段',
  width: '20%',
  render: (item) => (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column',
      alignItems: 'flex-start',
      p: 0.5,
      backgroundColor: '#f5f5f5',
      borderRadius: 1,
      textAlign: 'left'
    }}>
      <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
        {formatTimeRange(item.seg[0], item.seg[1])}
      </Typography>
    </Box>
  )
};

const textColumn = {
  key: 'text',
  label: '文本',
//   width: '65%',
  render: (item) => (
    <Typography variant="body1">
      {item.text}
    </Typography>
  )
};

const textEditColumn = {
  key: 'text',
  label: '文本',
//   width: '65%',
  render: (item, rowIndex, onTextChange) => (
    <TextField
      variant="outlined"
      size="small"
      fullWidth
      multiline // 添加多行支持
      minRows={1} // 最小显示1行
      maxRows={4} // 最多显示4行，超过显示滚动条
      value={item.text} // 使用value属性
      onChange={(e) => onTextChange(rowIndex, 'text',  e.target.value)} // 传递变化
    //   onBlur={(e) => {onTextChange(rowIndex, 'text', e.target.value);}}
      sx={{
        '& .MuiOutlinedInput-root': {
          padding: '4px 8px', // 适当内边距
          '& textarea': {
            resize: 'vertical' // 允许垂直调整大小
          }
        }
      }}
    />
  )
};


const optNoiseSpeakerColumn = {  // 修正变量名拼写错误
  key: 'voiceType',  // 建议使用更有意义的key
  label: '人声类型',
//   width: '15%',
  render: (item) => (
    <RadioGroup 
      value={item.voiceType || 'primary'}  // 添加value和onChange处理
      onChange={(e) => {
        // 这里需要实际的处理逻辑
        console.log('选择人声类型:', item.id, e.target.value);
      }}
      row  // 添加row使选项水平排列
    >
      <FormControlLabel 
        value="primary" 
        control={<Radio size="small" />} 
        label="主要"  // 缩短标签文本
      />
      <FormControlLabel 
        value="background" 
        control={<Radio size="small" />} 
        label="背景"  // 缩短标签文本
      />
    </RadioGroup>
  )
};



const qualityCheckColumn = createRadioColumn('is_drop', '是否删除', ['保留', '舍弃']);



// 在 getColumnsByType 中统一配置宽度
const getColumnsByType = (type = 'default') => {
  const columnTypes = {
    default: [
      { ...indexColumn },
      { ...segmentColumn },
      { ...textColumn }
    ],
    asrSegAnno: [
      { ...indexColumn },
      { ...segmentColumn },
      { ...textEditColumn }
    ],
    vadAnno: [
      { ...indexColumn },
      { ...segmentColumn }    
    ],
    vadAnnoCheck: [
      { ...indexColumn },
      { ...segmentColumn },
      { ...qualityCheckColumn }
    ],
    withVoiceType: [
      { ...indexColumn },
      { ...segmentColumn },
      { ...textColumn },
      { ...optNoiseSpeakerColumn }
    ],
    qualityCheck: [
      { ...indexColumn },
      { ...segmentColumn },
      { ...textColumn },
      { ...qualityCheckColumn }
    ],
    minimal: [
      { ...segmentColumn },
      { ...textColumn }
    ]
  };
  
  return columnTypes[type] || columnTypes.default;
};

const getColumnsByParams = (params) => { 
    // params [ ['index', 'timeRange', 'textEdit'], [['emotion', '情绪', '开心 伤心' ]， ['noise', '噪音', '有 无']]
    // 这个参数包含两个元素，第一个元素是列表，对应基础设置，每个元素对应一个预设列，  第二个元素是一个列表，每个元素对应createRadioColumn里面的值
    // 现在根据输入参数，创建类似getColumnsByType返回的值
    const columns = [];
    const presetMap = {
        'index': indexColumn,
        'timeRange': segmentColumn,
        'text': textColumn,
        'textEdit': textEditColumn,
        'optNoiseSpeaker': optNoiseSpeakerColumn,
        'qualityCheck': qualityCheckColumn
    };
    const presetKeys = Object.keys(presetMap);
    if (Array.isArray(params) && params.length === 2) {
        const baseCols = params[0];
        const radioCols = params[1];
        // 处理基础列
        baseCols.forEach(colKey => {
            if (presetKeys.includes(colKey)) {
                columns.push(presetMap[colKey]);
            }
        });
        // 处理单选列
        radioCols.forEach(radioCol => {
            if (Array.isArray(radioCol) && radioCol.length === 3) {
                const [key, label, optionsStr] = radioCol;
                const options = optionsStr.split(' ').filter(option => option.trim() !== '');
                if (key && label && options.length > 0) {
                    columns.push(createRadioColumn(key, label, options));
                }
            }
        });
    }
    return columns;
}


export { getColumnsByType, getColumnsByParams };
// export { indexColumn, segmentColumn, textColumn, textEditColumn, qualityCheckColumn, optNoiseSpeakerColumn, createRadioColumn };

