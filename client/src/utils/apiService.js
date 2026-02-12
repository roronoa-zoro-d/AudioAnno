/**
 *  anno: [ {seg: [100, 200], text: "你好"}, {seg: [200, 300], text: "世界"}]
 *  一个音频的标注结果： {name: asr, anno: anno}
 * 一个音频的多个标注结果 [{name: asr, anno: anno}, {name: ref, anno: anno}]
 */
// export const API_HOST = process.env.REACT_APP_API_HOST || 'http://localhost:9801';
// export const API_HOST = process.env.REACT_APP_API_HOST || 'http://10.130.253.103:9801';
export const API_HOST = process.env.REACT_APP_API_HOST || 'http://10.131.12.157:9900';


/**
 * 获取音频标注结果, 服务只返回一个
 * @param {string} audioUrl - 音频文件URL
 * @returns {Promise<Array>} - 返回标注结果数组 
 * {anno: [{seg:[], text:"你好"}, {}]}
 */
export const fetchAnnotation = async (datasetName, utt) => {
  try {
    // const utt = audioUrl.split('/').pop();
    const response = await fetch(`${API_HOST}/api/anno/${datasetName}/${utt}`);
    const data = await response.json();
    return data.anno;
  } catch (error) {
    console.error('Failed to fetch annotations:', error);
    return [];
  }
};

export const fetchAudioLabel = async (datasetName, utt) => {
  try {
    // const utt = audioUrl.split('/').pop();
    const response = await fetch(`${API_HOST}/api/anno_label/${datasetName}/${utt}`);
    const data = await response.json();
    return data.audio_label;
  } catch (error) {
    console.error('Failed to fetch audio label:', error);
    return {};
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

export const updateAudioLabel = async (username, datasetName, utt, label_key, label_value) => {
  try {
    const response = await fetch(`${API_HOST}/api/update_anno`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username,
        dataset_name: datasetName,
        utt,
        task_name: "label_task",
        label_data: {[label_key]: label_value},
      })
    });
    return await response.json();
  } catch (error) {
    console.error('更新标注失败:', error);
    console.log('更新 username:', username, ' datasetName:', datasetName, ' utt:', utt, ' label:', {[label_key]: label_value});
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
 * 对比标注结果和模型结果，发送到服务端处理
 * @param {Array} annoData - 标注结果数组
 * @param {Array} modelAnnoData - 模型结果数组
 * @returns {Promise<Object>} - 服务端返回处理结果
 */
export async function compareSegments(annoData, modelAnnoData) {
  try {
    const response = await fetch(`${API_HOST}/api/compare_segments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        annoData,
        modelAnnoData
      })
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error('Failed to compare segments:', error);
    return { status: 'error', message: error.message };
  }
}


// ...existing code...

/**
 * 上传badcase标注结果
 * @param {Object} payload - {audioName, modelName, solveStatus, problemType}
 * @returns {Promise<Object>} - 服务端返回结果，包含status字段
 */
export async function update_badcase(payload) {
  try {
    const response = await fetch(`${API_HOST}/api/update_badcase`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return await response.json();
  } catch (error) {
    return { status: 'error', message: error.message };
  }
}

// ...existing code...






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


// badcase 模块

// 上传 badcase 数据
export async function upload_badcase(formData) {
  try {
    const res = await fetch(`${API_HOST}/api/upload_badcase`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) return false;
    const data = await res.json();
    return data?.status === true;
  } catch (e) {
    return false;
  }
}

// 新增：获取 badcase 总览数据
export async function fetch_badcase_overview() {
  try {
    const res = await fetch(`${API_HOST}/api/badcase_list`);
    if (!res.ok) throw new Error('network');
    const data = await res.json();
    // 期望 data = { show_keys: [...], show_datas: [...] }
    return { ok: true, data };
  } catch (err) {
    return { ok: false, error: err.message || 'fetch error' };
  }
}

// 新增：根据 audioName 获取单条 badcase 详情
export async function fetch_badcase_detail(utt) {
  try {
    const url = `${API_HOST}/api/badcase/${utt}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`status ${res.status}`);
    const data = await res.json();
    return { ok: true, data };
  } catch (err) {
    return { ok: false, error: err.message || 'fetch error' };
  }
}

// 新增：更新 badcase 表格数据
export async function update_badcase_table(utt, key_name, key_val) {
  try {
    const res = await fetch(`${API_HOST}/api/update_badcase_table`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        utt,
        key_name,
        key_val
      })
    });
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const data = await res.json();
    return { ok: true, data };
  } catch (err) {
    return { ok: false, error: err.message || 'update error' };
  }
}

// WebSocket 流式 ASR 相关函数

/**
 * 创建流式ASR WebSocket连接
 * @param {string} wsUrl - WebSocket连接URL，由调用者定义
 * @param {Object} startMessage - 开始消息对象，将直接序列化为JSON发送
 * @param {Function} onMessage - 接收服务端消息的回调函数 (data) => {}
 * @param {Function} onError - 错误处理回调函数 (error) => {}
 * @param {Function} onClose - 连接关闭回调函数 () => {}
 * @returns {WebSocket} WebSocket实例
 */
export const createAsrWebSocket = (wsUrl, startMessage, onMessage, onError, onClose) => {
  const ws = new WebSocket(wsUrl);
  
  ws.onopen = () => {
    // 连接建立后，直接序列化 startMessage 并发送
    if (startMessage) {
      ws.send(JSON.stringify(startMessage));
    }
  };
  
  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      onMessage?.(data);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('解析ASR消息失败:', err);
    }
  };
  
  ws.onerror = (error) => {
    // eslint-disable-next-line no-console
    console.error('ASR WebSocket错误:', error);
    onError?.(error);
  };
  
  ws.onclose = () => {
    onClose?.();
  };
  
  return ws;
};

/**
 * 发送二进制数据到WebSocket
 * @param {WebSocket} ws - WebSocket连接
 * @param {ArrayBuffer|Int16Array|Uint8Array} binaryData - 二进制数据
 */
export const sendBinary = (ws, binaryData) => {
  if (ws && ws.readyState === WebSocket.OPEN) {
    // 如果是 TypedArray，需要确保字节序正确
    let buffer;
    if (binaryData instanceof ArrayBuffer) {
      buffer = binaryData;
    } else if (binaryData instanceof Int16Array) {
      // Int16Array 需要确保使用正确的字节序（little-endian）
      // 直接使用 buffer 即可，因为 JavaScript 的 TypedArray 默认就是 little-endian
      buffer = binaryData.buffer;
    } else {
      // 其他 TypedArray 也直接使用 buffer
      buffer = binaryData.buffer;
    }
    
    // 发送 ArrayBuffer
    ws.send(buffer);
  } else {
    // eslint-disable-next-line no-console
    console.warn('WebSocket未连接，无法发送二进制数据');
  }
};

/**
 * 发送文本消息到WebSocket（直接序列化后发送）
 * @param {WebSocket} ws - WebSocket连接
 * @param {Object} textMessage - 文本消息对象，将直接序列化为JSON发送
 */
export const sendText = (ws, textMessage) => {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(textMessage));
  } else {
    // eslint-disable-next-line no-console
    console.warn('WebSocket未连接，无法发送文本消息');
  }
};