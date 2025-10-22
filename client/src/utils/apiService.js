/**
 *  anno: [ {seg: [100, 200], text: "你好"}, {seg: [200, 300], text: "世界"}]
 *  一个音频的标注结果： {name: asr, anno: anno}
 * 一个音频的多个标注结果 [{name: asr, anno: anno}, {name: ref, anno: anno}]
 */
export const API_HOST = process.env.REACT_APP_API_HOST || 'http://localhost:9801';
// export const API_HOST = process.env.REACT_APP_API_HOST || 'http://10.130.253.103:9802';



/**
 * 获取音频标注结果, 服务只返回一个
 * @param {string} audioUrl - 音频文件URL
 * @returns {Promise<Array>} - 返回标注结果数组 
 * {anno: [{seg:[], text:"你好"}, {}]}
 */
export const fetchAnnotation = async (datasetName, audioUrl) => {
  try {
    const utt = audioUrl.split('/').pop();
    const response = await fetch(`${API_HOST}/api/anno/${datasetName}/${utt}`);
    const data = await response.json();
    return data.anno;
  } catch (error) {
    console.error('Failed to fetch annotations:', error);
    return [];
  }
};

/**
 * 获取音频标注结果, 服务只返回一个
 * @param {string} audioUrl - 音频文件URL
 * @returns {Promise<Array>} - 返回标注结果数组 
 * {anno: [{seg:[], text:"你好"}, {}]}
 */
export const fetchWerAnnotation = async (datasetName, wer_name, utt) => {
  try {
    
    const response = await fetch(`${API_HOST}/api/wer_list/${datasetName}/${wer_name}/${utt}`);
    const data = await response.json();
    return data.merged_segs;
  } catch (error) {
    console.error('Failed to fetch annotations:', error);
    return [];
  }
};



/**
 * 上传/更新标注数据
 * @param {string} username - 用户名
 * @param {string} datasetName - 数据集名称
 * @param {string} utt - 音频ID
 * @param {any} annoData - 标注数据
 * @returns {Promise<Object>} - 服务端返回结果
 */
export const updateAnnotation = async (username, datasetName, utt, annoData) => {
  try {
    const response = await fetch(`${API_HOST}/api/update_anno`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username,
        dataset_name: datasetName,
        utt,
        anno_data: annoData,
        task_name: "anno_task"
      })
    });
    return await response.json();
  } catch (error) {
    console.error('更新标注失败:', error);
    console.log('更新 username:', username, ' datasetName:', datasetName, ' utt:', utt, ' annoData:', annoData);
    return { status: 'error', message: error.message };
  }
};
export const updateCheck = async (username, datasetName, utt, check_status) => {
  try {
    const response = await fetch(`${API_HOST}/api/update_anno`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username,
        dataset_name: datasetName,
        utt,
        task_name: "check_task",
        check_status: check_status,
      })
    });
    return await response.json();
  } catch (error) {
    console.error('更新标注失败:', error);
    console.log('更新 username:', username, ' datasetName:', datasetName, ' utt:', utt, ' check_status:', check_status);
    return { status: 'error', message: error.message };
  }
};


/**
 * 获取音频标注结果
 * @param {string} audioUrl - 音频文件URL
 * @returns {Promise<Array>} - 返回标注结果数组 
 * [{name:asr, anno: [{seg:[], text:"你好"}, {}]}
 *  {name:ref, anno: [{}, {}]}                           ]
 */
export const fetchAnnotations = async (audioUrl) => {
  try {
    const utt = audioUrl.split('/').pop();
    const response = await fetch(`${API_HOST}/api/annos/${utt}`);
    const data = await response.json();
    return data.annos;
  } catch (error) {
    console.error('Failed to fetch annotations:', error);
    return [];
  }
};


/**
 * 合并两个标注结果
 * @param {Object} anno1 - 第一个标注结果   {name: asr, anno: [ {seg: [100, 200], text: "你好"}, {seg: [200, 300], text: "世界"}] }
 * @param {Object} anno2 - 第二个标注结果
 * @returns {Promise<Array>} - 返回合并后的标注结果数组 [{seg:[100,300], asr:"你好"， “ref”: "他好"}, {},... {}]
 */
export const mergeAnnotations = async (anno1, anno2) => {
  try {
    const response = await fetch(`${API_HOST}/api/merge_annotations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        anno1: anno1,
        anno2: anno2,
      }),
    });
    const data = await response.json();
    return data.results;
  } catch (error) {
    console.error('Failed to merge annotations:', error);
    return [];
  }
};


/**
 * 从 mergedData 中获取高亮区域
 * @param {Array} mergedData - 合并后的标注数据
 * @returns {Array} - 返回高亮区域数组
 */
export const getRegions_mergeData = (mergedData) => {
  return mergedData.map(seg_res => ({
    start: seg_res.seg[0],
    end: seg_res.seg[1] ,
    color: 'rgba(255, 165, 0, 0.3)', // 合并区域使用橙色
  }));
};

/**
 * 从 annotations 中获取高亮区域
 * @param {Array} selectedNames - 选中的标注名称
 * @param {Array} annotations - 所有标注数据
 * @returns {Array} - 返回高亮区域数组
 */
export const getRegions_annos = (selectedNames, annotations) => {
  const colors = [
    'rgba(255, 0, 0, 0.3)', // 红色
    'rgba(0, 255, 0, 0.3)', // 绿色
    'rgba(0, 0, 255, 0.3)', // 蓝色
    'rgba(255, 255, 0, 0.3)', // 黄色
    'rgba(255, 0, 255, 0.3)', // 紫色
    'rgba(0, 255, 255, 0.3)', // 青色
    'rgba(128, 0, 128, 0.3)', // 深紫色
    'rgba(255, 165, 0, 0.3)', // 橙色
  ];

  return selectedNames.flatMap(selectedName => {
    const selectedAnnotation = annotations.find(anno => anno.name === selectedName);
    const index = annotations.findIndex(anno => anno.name === selectedName);
    return selectedAnnotation.anno.map(anno => ({
      start: anno.seg[0],
      end: anno.seg[1],
      color: colors[index % colors.length],
    }));
  });
};


/**
 * 获取所有数据集信息
 * @returns {Promise<Array>} - 返回数据集列表
 */
export const fetchDatasetList = async () => {
  try {
    const response = await fetch(`${API_HOST}/api/dataset/dataset_infos`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Failed to fetch dataset list:', error);
    return [];
  }
};


/**
 * 激活（加载）指定数据集
 * @param {string} datasetName - 数据集名称
 * @returns {Promise<{status: string, message: string}>} - 返回加载结果
 */
export const activateDataset = async (datasetName) => {
  try {
    const response = await fetch(`${API_HOST}/api/dataset/load/${datasetName}`, {
      method: 'POST',
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Failed to activate dataset:', error);
    return { status: 'error', message: error.message };
  }
};


