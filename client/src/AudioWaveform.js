import React, { useRef, useEffect, useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import WaveSurfer from 'wavesurfer.js';
import Spectrogram from 'wavesurfer.js/dist/plugins/spectrogram.esm.js';
import Hover from 'wavesurfer.js/dist/plugins/hover.esm.js';
import TimelinePlugin from 'wavesurfer.js/dist/plugins/timeline.esm.js';
import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions.esm.js';
import Minimap from 'wavesurfer.js/dist/plugins/minimap.esm.js'
import { getWaveformWidth } from './utils/domUtils';

// 将纯函数定义在组件外部
const sortRegionsByStartTime = (regions) => {
  return [...regions].sort((a, b) => a.start - b.start);
};

const AudioWaveform = forwardRef(({
    audioUrl,
    onRegionAdded,
    onRegionRemoved,
    onRegionUpdated,
    onAudioReady,
    activeRegionId, // 新增这一行
    minPxPerSec, // 新增参数
}, ref) => {
  const waveformRef = useRef(null);
  const spectrogramRef = useRef(null);
  // const sliderRef = useRef(null);
  const [wavesurfer, setWavesurfer] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeRegion, setActiveRegion] = useState(null);
  const [highlightedRegions, setHighlightedRegions] = useState([]);

  

  // 使用 ref 存储最新状态
  const stateRef = useRef();
  stateRef.current = {
    highlightedRegions,
    activeRegion,
    wavesurfer,
    isPlaying
  };

//   console.log(`[AudioWaveform] 组件渲染 ${Date.now()}-${Math.random().toString(36).substr(2, 5)}`);





  // region组件添加区域 ： 使用 useCallback 定义稳定的事件处理函数
  const handleRegionCreated = useCallback((region) => {
    const { highlightedRegions } = stateRef.current;    // 获取最新状态值
    const regionObj = {
      id: region.id,
      start: region.start,
      end: region.end,
      color: region.color || 'rgba(100, 149, 237, 0.2)',
    };
    
    console.log('[监听-新区创建]  添加新区域:', regionObj);

    // 检查重叠
    const isOverlap = highlightedRegions.some(r =>
      !(regionObj.end >= r.start - 0.02 || regionObj.start <= r.end + 0.02)
    );

    if (isOverlap) {
      console.warn('[监听-新区创建重叠] 新建区域与现有高亮区域重叠，忽略添加:', regionObj);
    //   region.remove();
      return;
    }
    
    // setHighlightedRegions(prev => [...prev, regionObj]);
    // setHighlightedRegions(prev => sortRegionsByStartTime([...prev, regionObj]));
    setHighlightedRegions(prev => {
        const newRegions = [...prev, regionObj];
        // console.log('当前区域总数:', newRegions.length);
        return sortRegionsByStartTime(newRegions);
    });
    setActiveRegion(regionObj);
    onRegionAdded?.(regionObj);
  }, [onRegionAdded]);

  // region组件删除区域:
  const handleRegionRemoved = useCallback((region) => {
    console.log('[监听-区域删除] 删除区域:', region.id);
    setHighlightedRegions(prev => prev.filter(r => r.id !== region.id));
    setActiveRegion(null);
    onRegionRemoved?.(region.id);
  }, [onRegionRemoved]);

  // region组件区域更新
  const handleRegionUpdated = useCallback((region) => {
    const updatedRegion = {
      id: region.id,
      start: region.start,
      end: region.end,
      color: region.color || 'rgba(100, 149, 237, 0.2)',
    };
    console.log('[监听-区域更新] 更新区域:', updatedRegion);
    
    // setHighlightedRegions(prev => 
    //   prev.map(r => r.id === region.id ? updatedRegion : r)
    // );
    // 更新区域并排序
    setHighlightedRegions(prev => 
      sortRegionsByStartTime(prev.map(r => r.id === region.id ? updatedRegion : r))
    );
    setActiveRegion(updatedRegion);
    onRegionUpdated?.(updatedRegion);
  }, [onRegionUpdated]);

  // 键盘单击双击事件函数
  const handleRegionClicked = useCallback((region, e) => {
    const { wavesurfer } = stateRef.current;
    const regionObj = {
      id: region.id,
      start: region.start,
      end: region.end,
      color: region.color || 'rgba(100, 149, 237, 0.2)',
    };
    
    setActiveRegion(regionObj);


    if (e && e.detail === 2) {
      console.log('[监听-区域点击] 双击播放区域:', regionObj);
      e.stopPropagation();
      setIsPlaying(true);
      wavesurfer.play(region.start, region.end);
      setIsPlaying(false);
    } else {
      console.log('[监听-区域点击] 单击设置活动区域:', regionObj);
    }
  }, []);

  // 键盘监听删除区域
  const handleKeyDown = useCallback((e) => {
    const { activeRegion, wavesurfer } = stateRef.current;
    // 支持 Mac 的 Command 键和 Ctrl 键
    const isCtrlOrCmd = e.ctrlKey || e.metaKey;
    if (isCtrlOrCmd && (e.key === 'Backspace' || e.key === 'Delete') && activeRegion) {
      console.log('[键盘监听] 删除活动区域:', activeRegion);
      
      const regionsPlugin = wavesurfer?.getActivePlugins().find(
        plugin => plugin instanceof RegionsPlugin
      );
      const region = regionsPlugin?.getRegions().find(r => r.id === activeRegion.id);
      
      if (region) {
        region.remove();
      }
      
    }
  }, []);


  // WaveSurfer 实例只初始化一次
  useEffect(() => {
    if (!waveformRef.current || !spectrogramRef.current) return;

    console.log('[初始化] 创建 WaveSurfer 实例');
    
    const ws = WaveSurfer.create({
      container: waveformRef.current,
      waveColor: '#4e73df',
      progressColor: '#1cc88a',
      cursorColor: '#36b9cc',
      cursorWidth: 1,
      height: 200,
      // minPxPerSec: 30, // 不设置  minPxPerSec ，默认展示全部波形
      ...(typeof minPxPerSec === 'number' ? { minPxPerSec } : {}), // 只在有参数时设置
      plugins: [
        RegionsPlugin.create({
          dragSelection: {
            slop: 4,
            color: 'rgba(100, 149, 237, 0.2)',
          },
        }),
        Hover.create({
          lineColor: '#ff0000',
          lineWidth: 1,
          labelBackground: '#555',
          labelColor: '#fff',
          labelSize: '11px',
        }),
        Spectrogram.create({
          container: spectrogramRef.current,
          labels: true,
          height: 100,
        }),
        TimelinePlugin.create({
          height: 20,
          timeInterval: 0.5,
          primaryLabelInterval: 5,
          secondaryLabelInterval: 1,
          style: {
            fontSize: '10px',
            color: '#333',
          },
        }),
        // Register the plugin
        Minimap.create({
          height: 40,
          waveColor: '#ddd',
          progressColor: '#999',
          // the Minimap takes all the same options as the WaveSurfer itself
        }),
      ],
    });

    setWavesurfer(ws);

    return () => {
      console.log("[AudioWaveform] 销毁 WaveSurfer 实例");
      ws.destroy();
      setWavesurfer(null);
    };
  }, [minPxPerSec]);
  // 加载音频
  useEffect(() => {
    if (wavesurfer && audioUrl) {
      console.log('[音频加载] 开始加载音频:', audioUrl);
      setIsReady(false);
      setIsPlaying(false);
      
      wavesurfer.load(audioUrl);

      const onReady = () => {
        setIsReady(true);

        setTimeout(() => {
          (async () => {
            const duration = wavesurfer.getDuration();
            const waveEl = waveformRef.current;
            console.log('[调试] waveformRef.current:', waveEl);
            // 使用工具函数稳健查找宽度（返回 CSS 像素）
            const width = await getWaveformWidth(waveEl, wavesurfer, { maxAttempts: 8, baseDelay: 100 });
            console.log('[调试] 查找到的波形宽度（CSS 像素）:', width);
            console.log('[调试] duration:', duration);
            if (width && duration) {
              const pxPerSec = width / duration;
              console.log(`[调试] 当前每秒音频对应像素点数: ${pxPerSec}`);
            } else {
              console.log('[调试] 未获取到宽度或音频时长');
            }
          })();
         }, 100);

        const regionsPlugin = wavesurfer.getActivePlugins().find(
          plugin => plugin instanceof RegionsPlugin
        );
        
        if (regionsPlugin) {
          console.log('[音频加载] 清空插件区域');
          regionsPlugin.clearRegions();
          setHighlightedRegions([]);
          console.log('[音频加载] 启用拖拽选择');
          regionsPlugin.enableDragSelection({
            slop: 2,
            color: 'rgba(100, 149, 237, 0.2)',
          });
        }
        onAudioReady?.()
      };

      wavesurfer.on('ready', onReady);

      return () => {
        wavesurfer.un('ready', onReady);
      };
    }
  }, [wavesurfer, audioUrl, onAudioReady]);

  // 绑定事件 - 只依赖 wavesurfer
  useEffect(() => {
    if (!wavesurfer) return;

    console.log('[事件绑定] 初始化绑定区域事件');
    
    const regionsPlugin = wavesurfer.getActivePlugins().find(
      plugin => plugin instanceof RegionsPlugin
    );
    if (!regionsPlugin) return;

    regionsPlugin.on('region-created', handleRegionCreated);
    regionsPlugin.on('region-removed', handleRegionRemoved);
    regionsPlugin.on('region-clicked', handleRegionClicked);
    regionsPlugin.on('region-updated', handleRegionUpdated);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      console.log('[事件绑定] 组件卸载时解绑事件');
      regionsPlugin.un('region-created', handleRegionCreated);
      regionsPlugin.un('region-removed', handleRegionRemoved);
      regionsPlugin.un('region-clicked', handleRegionClicked);
      regionsPlugin.un('region-updated', handleRegionUpdated);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [wavesurfer, handleRegionCreated, handleRegionRemoved, handleRegionClicked, handleRegionUpdated, handleKeyDown]);



  // 播放/暂停控制
  const onPlayPause = useCallback(() => {
    if (wavesurfer) {
      console.log('[播放控制] 切换播放状态:', stateRef.current.isPlaying ? '暂停' : '播放');
      wavesurfer.playPause();
      setIsPlaying(!stateRef.current.isPlaying);
    }
  }, [wavesurfer]);


//   // 暴露组件方法给父组件
  useImperativeHandle(ref, () => ({
    // 新增接口：创建高亮区域
    createRegion: (start, end, color, externalId) => {
      if (!wavesurfer) return null;
      
      const regionsPlugin = wavesurfer.getActivePlugins()
        .find(plugin => plugin instanceof RegionsPlugin);
      
      if (!regionsPlugin) return null;
      console.log('[AudioWaveform 接口] 创建区域 id ', externalId, ' ', start, ',', end);
      const region = regionsPlugin.addRegion({
        id: externalId || `region-${Date.now()}`,
        start,
        end,
        color: color || 'rgba(100, 149, 237, 0.2)',
        drag: true,
        resize: true
      });
      
      return region.id;
    },
    
    // 新增接口：播放指定区域
    playRegion: (start, end) => {
      if (!waveformRef.current) {
        console.error('[AudioWaveform] wavesurfer 实例未初始化');
        return;
      }
      if (wavesurfer) {
        console.log("[AudioWaveform] 播放区域 ", start, ' - ', end);
        setIsPlaying(true);
        wavesurfer.play(start, end);
        setIsPlaying(false);
      }
    }
  }));



  useEffect(() => {
    if (activeRegionId) {
      // 这里根据 activeRegionId 设置激活区域
      setActiveRegion(prev => {
        if (prev && prev.id === activeRegionId) return prev;
        const region = highlightedRegions.find(r => r.id === activeRegionId);
        return region || null;
      });
    }
  }, [activeRegionId, highlightedRegions]);



  // 在UI中显示
  return (
    <div style={{ width: '100%', padding: '20px', minWidth: 0 /* 避免在 flex 中被内容撑开 */ }}>
      
      
      {!isReady && <p>音频加载中...</p>}

      <div style={{ display: 'flex', gap: '10px', marginBottom: '10px', alignItems: 'center' }}>
        <button onClick={onPlayPause} disabled={!isReady}>
          {isPlaying ? '暂停' : '播放'}
        </button>
      </div>

      <div style={{
        position: 'relative',
        border: '1px solid #ddd',
        borderRadius: '4px',
        padding: '10px',
        backgroundColor: '#f8f9fa',
        // marginBottom: '20px',
        minWidth: 0,            // 关键：允许在 flex 中收缩
        overflowX: 'auto',     // 关键：如果 canvas 很宽，出现横向滚动而不是撑开父容器
        boxSizing: 'border-box'
      }}>
        <div ref={waveformRef} style={{ marginBottom: '10px', minWidth: 0 }} />
        <div ref={spectrogramRef} />
      </div>
      

      

    </div>
  );
});

export default AudioWaveform;