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

const BackgroundVoiceFilter = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [status, setStatus] = useState('未开始录制');
  const [recordedInfo, setRecordedInfo] = useState(null); // { samples: Int16Array, sampleRate: 16000 }
  const [playbackUrl, setPlaybackUrl] = useState(null);
  const [asrResult, setAsrResult] = useState(null); // 存储ASR识别结果

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

  // 处理ASR服务返回的消息（异步处理，通过setState更新UI）
  const handleAsrMessage = useCallback((data) => {
    // eslint-disable-next-line no-console
    console.log('========== 处理ASR消息 ==========');
    // eslint-disable-next-line no-console
    console.log('完整消息对象:', JSON.stringify(data, null, 2));
    // eslint-disable-next-line no-console
    console.log('消息类型:', typeof data);
    // eslint-disable-next-line no-console
    console.log('消息键:', Object.keys(data));
    
    // 检测是否为最终消息（根据服务端返回的特殊字段判断）
    // 可能的字段：is_final, type === 'final', status === 'completed' 等
    const isFinalMessage = data.is_final === true 
      || data.type === 'final' 
      || data.status === 'completed'
      || data.action === 'end'
      || (data.final !== undefined && data.final === true);
    
    // eslint-disable-next-line no-console
    console.log('是否为最终消息:', isFinalMessage);
    
    // 根据服务端返回的数据结构处理
    if (data.type === 'partial') {
      // 中间识别结果（流式返回）
      const partialText = data.text || data.result || data.partial_text || '';
      // eslint-disable-next-line no-console
      console.log('更新中间结果:', partialText);
      setAsrResult(prev => ({
        ...prev,
        partial: partialText
      }));
    } else if (data.type === 'final' || isFinalMessage) {
      // 最终识别结果
      const finalText = data.text || data.result || data.final_text || '';
      // eslint-disable-next-line no-console
      console.log('更新最终结果:', finalText);
      setAsrResult(prev => ({
        ...prev,
        final: finalText,
        partial: null
      }));
      
      // 收到最终消息后，关闭WebSocket连接
      if (isFinalMessage) {
        // eslint-disable-next-line no-console
        console.log('收到最终消息，准备关闭WebSocket连接');
        closeWebSocket();
      }
    } else if (data.text || data.result) {
      // 兼容其他格式（没有type字段，但有text或result字段）
      const text = data.text || data.result || '';
      // eslint-disable-next-line no-console
      console.log('更新文本结果（兼容格式）:', text);
      setAsrResult(prev => ({
        ...prev,
        final: text
      }));
      
      // 如果消息中包含最终标记，也关闭连接
      if (isFinalMessage) {
        closeWebSocket();
      }
    } else {
      // 如果都不匹配，至少打印出来看看
      // eslint-disable-next-line no-console
      console.warn('未识别的消息格式，无法提取文本:', data);
      // 尝试更新状态，即使格式不标准
      setAsrResult(prev => ({
        ...prev,
        final: JSON.stringify(data) // 至少显示原始数据
      }));
    }
    // eslint-disable-next-line no-console
    console.log('================================');
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

  // 采集到一帧 16k Int16 PCM 的回调
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
    setAsrResult(null);
    // 重置发送统计
    sentFramesStatsRef.current = { count: 0, totalSamples: 0, totalBytes: 0 };
    setStatus('正在连接ASR服务...');
    
    // 先建立WebSocket连接，连接成功后再开始录制
    try {
      // 构建WebSocket URL（由调用者定义，需要包含协议前缀）
      const wsUrl = `ws://10.131.12.157:8765/ws`;
      
      const startMessage = {
        action: 'start',
        sampleRate: TARGET_SAMPLE_RATE,
        format: 'pcm_int16',
      };
      
      // 创建WebSocket连接，但先不传入onopen处理，我们自己处理
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
    <div >
      <h1>背景人声过滤</h1>
      <div
        style={{
          marginTop: '32px',
          padding: '20px',
          borderRadius: '8px',
          border: '1px solid #e0e0e0',
          background: '#fafbfc',
        }}
      >
        <h2 style={{ marginTop: 0, marginBottom: '16px' }}>录制测试音频</h2>
        <p style={{ marginBottom: '12px', color: '#555' }}>
          点击下方按钮开始录音，再次点击即可结束录制。录制的音频会在前端缓存为 16k Int16 PCM 数据，可用于后续背景人声过滤算法测试。
        </p>
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

        {/* 显示ASR识别结果 */}
        {asrResult && (
          <div style={{ marginTop: '16px', padding: '12px', background: '#f0f0f0', borderRadius: '4px' }}>
            <div style={{ fontWeight: 500, marginBottom: '8px' }}>ASR识别结果：</div>
            {asrResult.partial && (
              <div style={{ color: '#666', fontStyle: 'italic' }}>
                识别中: {asrResult.partial}
              </div>
            )}
            {asrResult.final && (
              <div style={{ color: '#333', fontWeight: 500 }}>
                最终结果: {asrResult.final}
              </div>
            )}
          </div>
        )}

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

export default BackgroundVoiceFilter;
