import React, { useCallback, useEffect, useRef, useState } from 'react';
import AudioRecord from './audioRecord';
import AudioWaveform from './AudioWaveform';
import { createAsrWebSocket, sendBinary, sendText, API_HOST } from './utils/apiService';

// 将 Int16 PCM 数据封装为 WAV Blob，方便浏览器直接回放
const createWavBlobFromPcm = (samples, sampleRate) => {
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataSize = samples.length * 2;

  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  let offset = 0;
  const writeString = (str) => {
    for (let i = 0; i < str.length; i += 1) {
      view.setUint8(offset, str.charCodeAt(i));
      offset += 1;
    }
  };

  // RIFF header
  writeString('RIFF');
  view.setUint32(offset, 36 + dataSize, true); offset += 4;
  writeString('WAVE');

  // fmt chunk
  writeString('fmt ');
  view.setUint32(offset, 16, true); offset += 4; // Subchunk1Size (16 for PCM)
  view.setUint16(offset, 1, true); offset += 2; // AudioFormat (1 = PCM)
  view.setUint16(offset, numChannels, true); offset += 2;
  view.setUint32(offset, sampleRate, true); offset += 4;
  view.setUint32(offset, byteRate, true); offset += 4;
  view.setUint16(offset, blockAlign, true); offset += 2;
  view.setUint16(offset, bitsPerSample, true); offset += 2;

  // data chunk
  writeString('data');
  view.setUint32(offset, dataSize, true); offset += 4;

  for (let i = 0; i < samples.length; i += 1) {
    view.setInt16(offset, samples[i], true);
    offset += 2;
  }

  return new Blob([buffer], { type: 'audio/wav' });
};

const WS_BASE = 'ws://10.131.12.157:8765';

const PersonalizedVad = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [status, setStatus] = useState('未开始录制');
  const [recordedInfo, setRecordedInfo] = useState(null); // { samples: Int16Array, sampleRate: 16000 }
  const [playbackUrl, setPlaybackUrl] = useState(null);
  const [asrMessages, setAsrMessages] = useState([]); // 存储所有服务端返回的消息（类似终端日志，不覆盖）

  // 任务类型：'enroll' | 'test'，二者只能选其一
  const [taskType, setTaskType] = useState('enroll');
  // 声纹注册任务参数
  const [enrollUser, setEnrollUser] = useState('zhangsan');
  const [enrollWinSize, setEnrollWinSize] = useState(1.5);
  const [enrollWinStep, setEnrollWinStep] = useState(0.75);
  const [enrollSlidding, setEnrollSlidding] = useState(true);
  // 声纹测试任务参数
  const [testUser, setTestUser] = useState('zhangsan');
  const [testSpeakerSimTh, setTestSpeakerSimTh] = useState(0.5);

  const recordedFramesRef = useRef([]); // 收集每一帧 Int16 PCM（16k）
  const audioRef = useRef(null);
  const wsRef = useRef(null); // WebSocket连接引用
  const finalMessageTimeoutRef = useRef(null); // 等待最终消息的超时引用
  const sentFramesStatsRef = useRef({ count: 0, totalSamples: 0, totalBytes: 0 }); // 发送统计信息
  const TARGET_SAMPLE_RATE = 16000;

  // 关闭WebSocket连接的辅助函数
  const closeWebSocket = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (finalMessageTimeoutRef.current) {
      clearTimeout(finalMessageTimeoutRef.current);
      finalMessageTimeoutRef.current = null;
    }
  }, []);

  // 处理ASR服务返回的消息：追加到列表，不覆盖（类似终端打印）
  const handleAsrMessage = useCallback((data) => {
    // eslint-disable-next-line no-console
    console.log('========== 处理ASR消息 ==========', data);

    const isFinalMessage = data.is_final === true
      || data.type === 'final'
      || data.status === 'completed'
      || data.action === 'end'
      || (data.final !== undefined && data.final === true);

    const isTarget = data.is_target === true
      || data.is_target === 1
      || data.is_target === 'true';

    const text = data.text ?? data.data?.text ?? data.result ?? data.partial_text ?? data.final_text ?? '';
    const displayText = typeof text === 'string' ? text : JSON.stringify(text);
    const typeLabel = data.type || (isFinalMessage ? 'final' : 'message');
    

    // 追加一条消息到列表（不覆盖之前的）
    setAsrMessages(prev => [
      ...prev,
      {
        id: Date.now() + Math.random(),
        time: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
        type: typeLabel,
        text: displayText,
        isFinal: isFinalMessage,
        isTarget,
        raw: data,
      },
    ]);

    if (isFinalMessage) {
      closeWebSocket();
    }
  }, [closeWebSocket]);

  const handleAsrError = useCallback((error) => {
    // eslint-disable-next-line no-console
    console.error('ASR服务错误:', error);
    setStatus('ASR服务连接错误');
    setIsRecording(false); // 连接失败时停止录制状态
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  const handleAsrClose = useCallback((event) => {
    // eslint-disable-next-line no-console
    console.log('ASR WebSocket连接已关闭', event);
    // 如果连接关闭时还在录制状态，说明是异常关闭
    if (isRecording) {
      setStatus('ASR服务连接已断开');
      setIsRecording(false);
    }
    wsRef.current = null;
  }, [isRecording]);

  // 录音组件采集到一帧音频的回调函数  16k Int16 PCM 的回调
  const handleFrame = useCallback((frame) => {
    // 1. 继续缓存到本地（用于回放）
    recordedFramesRef.current.push(frame);
    
    // 2. 如果ASR连接已建立，立即发送这一帧
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      // 统计发送的数据
      sentFramesStatsRef.current.count += 1;
      sentFramesStatsRef.current.totalSamples += frame.length;
      sentFramesStatsRef.current.totalBytes += frame.length * 2; // Int16 每个样本2字节
      
      sendBinary(wsRef.current, frame);
    }
  }, []);

  const handleStartRecording = () => {
    recordedFramesRef.current = [];
    setRecordedInfo(null);
    setAsrMessages([]); // 开始新一次录制时清空消息日志
    sentFramesStatsRef.current = { count: 0, totalSamples: 0, totalBytes: 0 };
    setStatus('正在连接服务...');

    try {
      // 根据任务类型选择 URL 和 startMessage
      let wsUrl;
      let startMessage;

      if (taskType === 'enroll') {
        wsUrl = `${WS_BASE}/speaker_enroll`;
        startMessage = {
          task: 'enroll',
          user: enrollUser.trim() || 'zhangsan',
          win_size: Number(enrollWinSize) || 1.5,
          win_step: Number(enrollWinStep) || 0.75,
          slidding: !!enrollSlidding,
          sampleRate: TARGET_SAMPLE_RATE,
          format: 'pcm_int16',
        };
      } else {
        wsUrl = `${WS_BASE}/ws`;
        startMessage = {
          task: 'test',
          user: testUser.trim() || 'zhangsan',
          speaker_sim_th: Number(testSpeakerSimTh) || 0.5,
          sampleRate: TARGET_SAMPLE_RATE,
          format: 'pcm_int16',
        };
      }

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      
      // 设置连接超时（10秒）
      const connectTimeout = setTimeout(() => {
        if (ws.readyState !== WebSocket.OPEN) {
          // eslint-disable-next-line no-console
          console.error('WebSocket连接超时');
          setStatus('ASR服务连接超时，请检查网络或服务地址');
          setIsRecording(false);
          ws.close();
          wsRef.current = null;
        }
      }, 10000);
      
      // 连接成功
      ws.onopen = () => {
        clearTimeout(connectTimeout);
        // 连接建立后，发送开始消息
        if (startMessage) {
          ws.send(JSON.stringify(startMessage));
        }
        setStatus('ASR服务已连接，正在录制中...');
        setIsRecording(true); // 连接成功后才开始录制
      };
      
      // 接收消息（WebSocket的onmessage本身就是异步的）
      ws.onmessage = (event) => {
        // eslint-disable-next-line no-console
        console.log('收到WebSocket原始消息:', event.data, '类型:', typeof event.data);
        
        try {
          // 检查是否是文本消息（JSON）
          let data;
          if (typeof event.data === 'string') {
            data = JSON.parse(event.data);
          } else if (event.data instanceof Blob) {
            // 如果是Blob，先转换为文本
            event.data.text().then(text => {
              try {
                const parsedData = JSON.parse(text);
                // eslint-disable-next-line no-console
                console.log('解析Blob消息成功:', parsedData);
                handleAsrMessage(parsedData);
              } catch (parseErr) {
                // eslint-disable-next-line no-console
                console.error('解析Blob消息失败:', parseErr, '原始文本:', text);
              }
            });
            return; // Blob需要异步处理，直接返回
          } else {
            // eslint-disable-next-line no-console
            console.warn('收到未知类型的消息:', event.data);
            return;
          }
          
          // eslint-disable-next-line no-console
          console.log('解析JSON消息成功:', data);
          handleAsrMessage(data);
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error('解析ASR消息失败:', err, '原始数据:', event.data);
        }
      };
      
      // 连接错误
      ws.onerror = (error) => {
        clearTimeout(connectTimeout);
        handleAsrError(error);
      };
      
      // 连接关闭
      ws.onclose = (event) => {
        clearTimeout(connectTimeout);
        handleAsrClose(event);
      };
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('启动ASR连接失败:', err);
      setStatus('ASR服务连接失败: ' + err.message);
      setIsRecording(false); // 确保录制状态为 false
    }
  };

  // 结束录制 拼接全部帧，生成 WAV Blob
  const handleStopRecording = () => {
    setIsRecording(false);
    setStatus('正在结束录制...');

    // 1. 发送结束标记给ASR服务（由调用者定义结束消息）
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      // 打印发送的音频统计信息
      const stats = sentFramesStatsRef.current;
      const duration = stats.totalSamples / TARGET_SAMPLE_RATE; // 时长（秒）
      // eslint-disable-next-line no-console
      console.log('========== 音频发送统计 ==========');
      // eslint-disable-next-line no-console
      console.log('发送帧数:', stats.count);
      // eslint-disable-next-line no-console
      console.log('总样本数:', stats.totalSamples);
      // eslint-disable-next-line no-console
      console.log('总字节数:', stats.totalBytes, 'bytes');
      // eslint-disable-next-line no-console
      console.log('音频时长:', duration.toFixed(3), '秒');
      // eslint-disable-next-line no-console
      console.log('采样率:', TARGET_SAMPLE_RATE, 'Hz');
      // eslint-disable-next-line no-console
      console.log('格式: PCM Int16, 单声道');
      // eslint-disable-next-line no-console
      console.log('==================================');
      
      const endMessage = {
        action: 'end',
        is_final: true,
      };
      sendText(wsRef.current, endMessage);
      
      // 设置超时作为兜底：如果服务端在5秒内没有返回最终消息，也关闭连接
      // 正常情况下，应该在 onmessage 中检测到最终消息后立即关闭
      finalMessageTimeoutRef.current = setTimeout(() => {
        // eslint-disable-next-line no-console
        console.warn('等待最终消息超时，强制关闭WebSocket连接');
        closeWebSocket();
      }, 5000); // 给服务端5秒时间返回最终结果
    }

    // 2. 处理本地录音数据（用于回放）
    try {
      const frames = recordedFramesRef.current || [];
      let totalLength = 0;
      frames.forEach((f) => {
        totalLength += f.length;
      });

      const merged = new Int16Array(totalLength);
      let offset = 0;
      frames.forEach((f) => {
        merged.set(f, offset);
        offset += f.length;
      });

      const wavBlob = createWavBlobFromPcm(merged, TARGET_SAMPLE_RATE);
      if (playbackUrl) {
        URL.revokeObjectURL(playbackUrl);
      }
      const url = URL.createObjectURL(wavBlob);

      setRecordedInfo({
        samples: merged,
        sampleRate: TARGET_SAMPLE_RATE,
      });
      setPlaybackUrl(url);

      // 打印本地缓存的音频统计信息（用于对比）
      const localDuration = merged.length / TARGET_SAMPLE_RATE;
      // eslint-disable-next-line no-console
      console.log('========== 本地音频缓存统计 ==========');
      // eslint-disable-next-line no-console
      console.log('缓存样本数:', merged.length);
      // eslint-disable-next-line no-console
      console.log('缓存字节数:', merged.length * 2, 'bytes');
      // eslint-disable-next-line no-console
      console.log('音频时长:', localDuration.toFixed(3), '秒');
      // eslint-disable-next-line no-console
      console.log('采样率:', TARGET_SAMPLE_RATE, 'Hz');
      // eslint-disable-next-line no-console
      console.log('=====================================');
      
      // 对比发送和缓存的数据是否一致
      const sentStats = sentFramesStatsRef.current;
      if (sentStats.totalSamples !== merged.length) {
        // eslint-disable-next-line no-console
        console.warn('⚠️ 警告：发送的样本数与本地缓存不一致！');
        // eslint-disable-next-line no-console
        console.warn('发送样本数:', sentStats.totalSamples, 'vs 缓存样本数:', merged.length);
        // eslint-disable-next-line no-console
        console.warn('差异:', Math.abs(sentStats.totalSamples - merged.length), '样本');
      } else {
        // eslint-disable-next-line no-console
        console.log('✓ 发送的样本数与本地缓存一致');
      }

      setStatus('录制已结束，音频已缓存为 16k Int16 格式，可回放试听');
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('处理录音数据失败:', err);
      setStatus('录音数据处理失败');
    } finally {
      recordedFramesRef.current = [];
    }
  };

  // 组件卸载时清理WebSocket
  useEffect(() => {
    return () => {
      closeWebSocket();
    };
  }, [closeWebSocket]);

  const handleToggleRecording = () => {
    if (isRecording) {
      handleStopRecording();
    } else {
      handleStartRecording();
    }
  };

  return (
    <div>
      <h1>个性化VAD</h1>
      <div
        style={{
          marginTop: '32px',
          padding: '20px',
          borderRadius: '8px',
          border: '1px solid #e0e0e0',
          background: '#fafbfc',
        }}
      >
        <h2 style={{ marginTop: 0, marginBottom: '16px' }}>声纹注册 / 测试</h2>
        <p style={{ marginBottom: '16px', color: '#555' }}>
          选择「注册任务」或「测试任务」之一，填写参数后点击开始录制。录制的音频将发送至服务端并展示返回消息。
        </p>

        {/* 3 x 2 布局：第一行任务说明，第二行注册按钮+配置，第三行测试按钮+配置 */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '160px minmax(0, 1fr)',
            rowGap: '12px',
            columnGap: '24px',
            alignItems: 'flex-start',
            marginBottom: '20px',
          }}
        >
          {/* 第一行：任务选择说明 + 占位（可扩展其他配置） */}
          <div style={{ fontWeight: 600, paddingTop: '4px' }}>任务类型</div>
          <div style={{ color: '#666' }}>请选择下方「声纹注册任务」或「声纹测试任务」，并填写对应参数。</div>

          {/* 第二行：注册按钮 + 注册配置 */}
          <div>
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
              <input
                type="radio"
                name="taskType"
                checked={taskType === 'enroll'}
                onChange={() => setTaskType('enroll')}
                style={{ marginRight: '8px' }}
              />
              声纹注册任务
            </label>
          </div>
          <div>
            <div
              style={{
                marginBottom: '4px',
                padding: '12px 16px',
                border: `2px solid ${taskType === 'enroll' ? '#3498db' : '#e0e0e0'}`,
                borderRadius: '8px',
                background: taskType === 'enroll' ? '#f0f8ff' : '#fafafa',
              }}
            >
              <div style={{ fontWeight: 600, marginBottom: '10px' }}>注册任务配置</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px 20px', alignItems: 'center' }}>
                <span>
                  <label style={{ marginRight: '6px' }}>user:</label>
                  <input
                    type="text"
                    value={enrollUser}
                    onChange={(e) => setEnrollUser(e.target.value)}
                    placeholder="zhangsan"
                    style={{ width: '120px', padding: '4px 8px' }}
                  />
                </span>
                <span>
                  <label style={{ marginRight: '6px' }}>win_size:</label>
                  <input
                    type="number"
                    step={0.1}
                    value={enrollWinSize}
                    onChange={(e) => setEnrollWinSize(e.target.value)}
                    style={{ width: '70px', padding: '4px 8px' }}
                  />
                </span>
                <span>
                  <label style={{ marginRight: '6px' }}>win_step:</label>
                  <input
                    type="number"
                    step={0.1}
                    value={enrollWinStep}
                    onChange={(e) => setEnrollWinStep(e.target.value)}
                    style={{ width: '70px', padding: '4px 8px' }}
                  />
                </span>
                <span>
                  <label style={{ marginRight: '6px' }}>slidding:</label>
                  <select
                    value={enrollSlidding ? 'true' : 'false'}
                    onChange={(e) => setEnrollSlidding(e.target.value === 'true')}
                    style={{ padding: '4px 8px' }}
                  >
                    <option value="true">true</option>
                    <option value="false">false</option>
                  </select>
                </span>
              </div>
            </div>
          </div>

          {/* 第三行：测试按钮 + 测试配置 */}
          <div>
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
              <input
                type="radio"
                name="taskType"
                checked={taskType === 'test'}
                onChange={() => setTaskType('test')}
                style={{ marginRight: '8px' }}
              />
              声纹测试任务
            </label>
          </div>
          <div>
            <div
              style={{
                marginBottom: '4px',
                padding: '12px 16px',
                border: `2px solid ${taskType === 'test' ? '#3498db' : '#e0e0e0'}`,
                borderRadius: '8px',
                background: taskType === 'test' ? '#f0f8ff' : '#fafafa',
              }}
            >
              <div style={{ fontWeight: 600, marginBottom: '10px' }}>测试任务配置</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px 20px', alignItems: 'center' }}>
                <span>
                  <label style={{ marginRight: '6px' }}>user:</label>
                  <input
                    type="text"
                    value={testUser}
                    onChange={(e) => setTestUser(e.target.value)}
                    placeholder="zhangsan"
                    style={{ width: '120px', padding: '4px 8px' }}
                  />
                </span>
                <span>
                  <label style={{ marginRight: '6px' }}>speaker_sim_th:</label>
                  <input
                    type="number"
                    step={0.1}
                    min={0}
                    max={1}
                    value={testSpeakerSimTh}
                    onChange={(e) => setTestSpeakerSimTh(e.target.value)}
                    style={{ width: '70px', padding: '4px 8px' }}
                  />
                </span>
              </div>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleToggleRecording}
          style={{
            padding: '10px 24px',
            fontSize: '16px',
            borderRadius: '20px',
            border: 'none',
            cursor: 'pointer',
            backgroundColor: isRecording ? '#e74c3c' : '#3498db',
            color: '#fff',
            minWidth: '140px',
          }}
        >
          {isRecording ? '结束录制' : '开始录制'}
        </button>

        {isRecording && (
          <AudioRecord
            sampleRate={TARGET_SAMPLE_RATE}
            frameDurationMs={40}
            onFrame={handleFrame}
          />
        )}

        <div style={{ marginTop: '12px', fontSize: '14px', color: '#333' }}>
          当前状态：{status}
        </div>

        {/* 仅展示 type=asr_result 且 is_target=true 的消息，组件始终存在 */}
        <div style={{ marginTop: '16px' }}>
          <div style={{ fontWeight: 500, marginBottom: '8px', color: '#2e7d32' }}>
            目标说话人识别结果（is_target=true）：
          </div>
          <div
            style={{
              padding: '12px',
              background: '#1e1e1e',
              borderRadius: '4px',
              maxHeight: '120px',
              overflowY: 'auto',
              fontFamily: 'monospace',
              fontSize: '13px',
              color: '#4caf50',
              lineHeight: 1.5,
              borderLeft: '3px solid #4caf50',
            }}
          >
            {asrMessages
              .filter((m) => m.type === 'asr_result' && m.isTarget === true)
              .map((msg) => {
                const sim = msg.raw?.sim ?? msg.raw?.similarity;
                const simStr = typeof sim === 'number' ? sim.toFixed(2) : '--';
                const text = msg.raw?.data?.text ?? msg.text ?? '';
                return (
                  <div key={msg.id} style={{ marginBottom: '4px', wordBreak: 'break-all' }}>
                    <span style={{ color: '#858585', marginRight: '8px' }}>{msg.time}</span>
                    <span style={{ color: '#9cdcfe', marginRight: '12px' }}>{simStr}</span>
                    <span style={{ color: '#4caf50' }}>{text}</span>
                  </div>
                );
              })}
          </div>
        </div>

        {/* 服务端返回消息日志（类似终端，全部展示，可滚动） */}
        <div style={{ marginTop: '16px' }}>
          <div style={{ fontWeight: 500, marginBottom: '8px' }}>服务端消息日志：</div>
          <div
            style={{
              padding: '12px',
              background: '#1e1e1e',
              borderRadius: '4px',
              maxHeight: '200px',
              overflowY: 'auto',
              fontFamily: 'monospace',
              fontSize: '13px',
              color: '#d4d4d4',
              lineHeight: 1.5,
            }}
          >
            {asrMessages.length === 0 ? (
              <div style={{ color: '#888' }}>暂无消息，开始录制并说话后将在此显示服务端返回的所有消息。</div>
            ) : (
              asrMessages.map((msg) => {
                const isAsrResult = msg.type === 'asr_result';
                const isTarget = isAsrResult && msg.isTarget === true;
                const isNonTarget = isAsrResult && msg.isTarget === false;

                const borderColor = isAsrResult
                  ? isTarget
                    ? '#4caf50' // asr_result 且 is_target=true -> 绿色
                    : isNonTarget
                      ? '#e57373' // asr_result 且 is_target=false -> 红色
                      : '#2196f3'
                  : '#2196f3'; // 非 asr_result 类型统一蓝色

                const typeColor = isAsrResult
                  ? isTarget
                    ? '#4caf50'
                    : isNonTarget
                      ? '#e57373'
                      : '#9cdcfe'
                  : '#9cdcfe';

                const textColor = isTarget ? '#4caf50' : undefined; // 命中 target 时整条消息偏绿色

                return (
                  <div
                    key={msg.id}
                    style={{
                      marginBottom: '4px',
                      wordBreak: 'break-all',
                      borderLeft: `3px solid ${borderColor}`,
                      paddingLeft: '8px',
                    }}
                  >
                    <span style={{ color: '#858585', marginRight: '8px' }}>[{msg.time}]</span>
                    <span
                      style={{
                        marginRight: '8px',
                        color: typeColor,
                      }}
                    >
                      {msg.type}
                    </span>
                    {msg.text ? (
                      <span style={textColor ? { color: textColor } : undefined}>{msg.text}</span>
                    ) : (
                      <span style={textColor ? { color: textColor } : { color: '#888' }}>
                        {JSON.stringify(msg.raw)}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {recordedInfo && (
          <>
            <div style={{ marginTop: '8px', fontSize: '13px', color: '#666' }}>
              已缓存样本数：{recordedInfo.samples.length}（采样率：{recordedInfo.sampleRate} Hz）
            </div>
            {playbackUrl && (
              <>
                <div style={{ marginTop: '12px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      if (audioRef.current) {
                        audioRef.current.currentTime = 0;
                        audioRef.current.play();
                      }
                    }}
                    style={{
                      padding: '8px 18px',
                      fontSize: '14px',
                      borderRadius: '18px',
                      border: '1px solid #3498db',
                      cursor: 'pointer',
                      backgroundColor: '#fff',
                      color: '#3498db',
                      minWidth: '120px',
                    }}
                  >
                    回放录音
                  </button>
                  <audio ref={audioRef} src={playbackUrl} />
                </div>

                <div style={{ marginTop: '20px' }}>
                  <div style={{ marginBottom: '8px', fontWeight: 500 }}>
                    录音波形图 / 频谱图
                  </div>
                  <AudioWaveform audioUrl={playbackUrl} />
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default PersonalizedVad;

