import React, { useEffect, useState } from 'react';

const AudioList = ({ onSelectAudio }) => {
  const [audioList, setAudioList] = useState([]);
  const [selectedAudio, setSelectedAudio] = useState(null);

  useEffect(() => {
    const fetchAudioList = async () => {
      try {
        const response = await fetch('http://localhost:9801/api/audio_list');
        const data = await response.json();
        setAudioList(data.audios);
        console.log('get ', data.audios.length, ' audio')
      } catch (error) {
        console.error('Failed to fetch audio list:', error);
      }
    };

    fetchAudioList();
  }, []);

  const handleAudioClick = (audio) => {
    setSelectedAudio(audio);
    onSelectAudio(audio);
  };

  return (
    <div style={{ 
      width: '100%', // 改为100%宽度，由外部容器控制
      height: '100vh', 
      overflowY: 'auto',
      padding: '15px',
      backgroundColor: '#f8f9fa',
      borderRight: '1px solid #dee2e6',
      boxSizing: 'border-box' // 重要：包含padding在宽度内
    }}>
      <h2 style={{ 
        color: '#495057',
        marginBottom: '15px',
        textAlign: 'center',
        fontSize: '16px',
        fontWeight: '600'
      }}>音频列表</h2>
      
      <div style={{
        fontSize: '13px',
        color: '#6c757d',
        marginBottom: '12px',
        textAlign: 'center'
      }}>
        共 {audioList.length} 个音频文件
      </div>

      <ul style={{
        listStyleType: 'none',
        padding: 0,
        margin: 0
      }}>
        {audioList.map((audio) => (
          <li 
            key={audio} 
            onClick={() => handleAudioClick(audio)} 
            style={{
              cursor: 'pointer',
              padding: '10px 12px',
              marginBottom: '6px',
              backgroundColor: selectedAudio === audio ? '#e3f2fd' : '#fff',
              border: selectedAudio === audio ? '1px solid #2196f3' : '1px solid #e9ecef',
              borderRadius: '5px',
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              minHeight: '40px'
            }}
          >
            <span style={{ 
              flex: 1,
              fontSize: '13px',
              fontWeight: selectedAudio === audio ? '500' : '400',
              color: selectedAudio === audio ? '#1976d2' : '#495057',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: '100%', // 确保不超过容器宽度
              display: 'block'
            }}
            title={audio} // 添加悬停显示完整名称
            >
              {audio}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default AudioList;