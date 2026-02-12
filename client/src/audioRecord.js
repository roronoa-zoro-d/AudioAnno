import { useEffect, useRef } from 'react';

// 将 Float32 PCM 转为 Int16 PCM
const convertFloatToInt16 = (float32Array) => {
  const int16Array = new Int16Array(float32Array.length);
  for (let i = 0; i < float32Array.length; i += 1) {
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return int16Array;
};

// 将任意采样率简单下采样到目标采样率（线性平均）
const downsampleToTarget = (float32Array, originalSampleRate, targetSampleRate) => {
  if (originalSampleRate === targetSampleRate) {
    return float32Array.slice();
  }

  const ratio = originalSampleRate / targetSampleRate;
  const newLength = Math.round(float32Array.length / ratio);
  const downsampled = new Float32Array(newLength);

  let offsetResult = 0;
  let offsetBuffer = 0;

  while (offsetResult < newLength) {
    const nextOffsetBuffer = Math.round((offsetResult + 1) * ratio);
    let accum = 0;
    let count = 0;
    for (let i = offsetBuffer; i < nextOffsetBuffer && i < float32Array.length; i += 1) {
      accum += float32Array[i];
      count += 1;
    }
    downsampled[offsetResult] = accum / (count || 1);
    offsetResult += 1;
    offsetBuffer = nextOffsetBuffer;
  }

  return downsampled;
};

/**
 * 音频录制组件：
 * - 挂载时开始录制，卸载时结束录制并释放资源
 * - 每帧回调一段已经下采样到 target sampleRate 的 Int16 PCM 数据
 *
 * @param {object} props
 * @param {number} props.sampleRate     目标采样率（例如 16000）
 * @param {number} props.frameDurationMs 每帧时长（毫秒）
 * @param {(frame: Int16Array) => void} props.onFrame 采集到一帧的回调
 */
const AudioRecord = ({ sampleRate = 16000, frameDurationMs = 40, onFrame }) => {
  const mediaStreamRef = useRef(null);
  const audioContextRef = useRef(null);
  const sourceRef = useRef(null);
  const processorRef = useRef(null);
  const pendingRef = useRef(new Float32Array(0)); // 已下采样但尚未凑满一帧的数据

  useEffect(() => {
    let cancelled = false;

    const startRecording = async () => {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        // eslint-disable-next-line no-console
        console.error('当前浏览器不支持 getUserMedia，无法录音');
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        mediaStreamRef.current = stream;

        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        const audioContext = new AudioContextClass();
        audioContextRef.current = audioContext;

        const source = audioContext.createMediaStreamSource(stream);
        sourceRef.current = source;

        const processor = audioContext.createScriptProcessor(4096, 1, 1);
        processorRef.current = processor;

        const targetFrameSamples = Math.round((sampleRate * frameDurationMs) / 1000);

        processor.onaudioprocess = (event) => {
          const inputBuffer = event.inputBuffer.getChannelData(0);
          // 拷贝一份，避免后续缓冲区被覆盖
          const floatChunk = new Float32Array(inputBuffer);

          // 先下采样到目标采样率
          const downsampled = downsampleToTarget(floatChunk, audioContext.sampleRate, sampleRate);

          // 与上次剩余的部分拼接
          let pending = pendingRef.current;
          const merged = new Float32Array(pending.length + downsampled.length);
          merged.set(pending);
          merged.set(downsampled, pending.length);
          pending = merged;

          const frames = [];
          let offset = 0;
          while (pending.length - offset >= targetFrameSamples) {
            const frameFloat = pending.subarray(offset, offset + targetFrameSamples);
            const frameInt16 = convertFloatToInt16(frameFloat);
            frames.push(frameInt16);
            offset += targetFrameSamples;
          }

          const remaining = pending.length - offset;
          if (remaining > 0) {
            const rest = new Float32Array(remaining);
            rest.set(pending.subarray(offset));
            pendingRef.current = rest;
          } else {
            pendingRef.current = new Float32Array(0);
          }

          if (typeof onFrame === 'function') {
            frames.forEach((frame) => {
              onFrame(frame);
            });
          }
        };

        source.connect(processor);
        processor.connect(audioContext.destination);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('启动录音失败:', err);
      }
    };

    startRecording();

    return () => {
      cancelled = true;

      if (processorRef.current) {
        processorRef.current.disconnect();
        processorRef.current.onaudioprocess = null;
        processorRef.current = null;
      }
      if (sourceRef.current) {
        sourceRef.current.disconnect();
        sourceRef.current = null;
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
        mediaStreamRef.current = null;
      }
      pendingRef.current = new Float32Array(0);
    };
  }, [sampleRate, frameDurationMs, onFrame]);

  // 逻辑组件，不渲染任何可见内容
  return null;
};

export default AudioRecord;


