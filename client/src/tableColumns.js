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

      const current = item[key];
      return (
        <RadioGroup 
          value ={current || ''}
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

// info 列：渲染方式与 text 相同，但读取 item.info 字段
const infoColumn = {
  key: 'info',
  label: '信息',
  render: (item) => (
    <Typography variant="body1">
      {item.info}
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

const spkColumn = {
  key: 'spk',
  label: '说话人',
  render: (item) => (
    <Typography variant="body1">
      {item.spk}
    </Typography>
  )
};

const spkvadtextColumn = {
  key: 'spk',
  label: '说话人',
  render: (item, rowIndex, onTextChange, onPlayRangeAudio) => {
    // item.spk 是一个列表的列表，每个子列表包含4项：[说话人，开始时间，结束时间，文本]
    const spkDataList = Array.isArray(item.spk) ? item.spk : [];
    
    if (spkDataList.length === 0) {
      return (
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          无数据
        </Typography>
      );
    }
    
    return (
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'flex-start',
        p: 1,
        gap: 1
      }}>
        {spkDataList.map((spkItem, index) => {
          // 每个子列表包含4项：[说话人，开始时间，结束时间，文本]
          const spkArray = Array.isArray(spkItem) ? spkItem : [];
          const [speaker, startTime, endTime, text] = spkArray;
          
          return (
            <Box 
              key={index}
              sx={{ 
                display: 'flex', 
                flexDirection: 'row',
                alignItems: 'center',
                p: 1,
                backgroundColor: '#f5f5f5',
                borderRadius: 1,
                gap: 1.5,
                width: '100%',
                flexWrap: 'wrap'
              }}
              onClick={() => onPlayRangeAudio(startTime, endTime)}
            >
              {speaker && (
                <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                  {speaker}
                </Typography>
              )}
              {startTime !== undefined && endTime !== undefined && (
                <Typography variant="body2" sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>
                  {formatTimeRange(startTime, endTime)}
                </Typography>
              )}
              {text && (
                <Typography variant="body2" sx={{ color: 'text.primary' }}>
                  {text}
                </Typography>
              )}
            </Box>
          );
        })}
      </Box>
    );
  }
}


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
        'info': infoColumn,
        'textEdit': textEditColumn,
        'optNoiseSpeaker': optNoiseSpeakerColumn,
        'qualityCheck': qualityCheckColumn,
        'spk': spkvadtextColumn,
    };
    const presetKeys = Object.keys(presetMap);
    if (Array.isArray(params) && params.length >= 2) {
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
            else{ console.warn('Invalid radio column configuration:', radioCol);}
        });
    }
    return columns;
}

/** columnParams 为三段时第三段为整句标签；与分段单选同形 [enKey, zhTitle, options] */
const DEFAULT_AUDIO_LABEL_CONFIGS = [
    { labelKey: 'audio_quality', labelTitle: '音频质量', labelOptions: ['多人说话', '环境噪声', '干净音频', '舍弃音频'] },
];

/**
 * 解析整段音频的标签标注列表（columnParams 第三项）。
 * 仅当长度为 3 时解析第三项；否则返回默认（与原 LabelAnno 写死参数一致）。
 */
const parseAudioLabelConfigs = (columnParams) => {
    if (!Array.isArray(columnParams) || columnParams.length !== 3) {
        return DEFAULT_AUDIO_LABEL_CONFIGS;
    }
    const third = columnParams[2];
    if (!Array.isArray(third) || third.length === 0) {
        return DEFAULT_AUDIO_LABEL_CONFIGS;
    }
    const out = [];
    third.forEach((row) => {
        if (!Array.isArray(row) || row.length < 3) return;
        const [key, title, optionsRaw] = row;
        let options = [];
        if (Array.isArray(optionsRaw)) {
            options = optionsRaw.map((o) => String(o).trim()).filter(Boolean);
        } else if (typeof optionsRaw === 'string') {
            options = optionsRaw.split(/\s+/).map((s) => s.trim()).filter(Boolean);
        }
        if (key && title && options.length > 0) {
            out.push({ labelKey: key, labelTitle: title, labelOptions: options });
        }
    });
    return out.length > 0 ? out : DEFAULT_AUDIO_LABEL_CONFIGS;
};


export { getColumnsByType, getColumnsByParams, parseAudioLabelConfigs };
// export { indexColumn, segmentColumn, textColumn, textEditColumn, qualityCheckColumn, optNoiseSpeakerColumn, createRadioColumn };

