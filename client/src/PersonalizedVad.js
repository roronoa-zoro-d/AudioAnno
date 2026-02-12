import React from 'react';

const PersonalizedVad = () => {
  return (
    <div style={{ padding: '40px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>个性化VAD</h1>
      <div style={{ marginTop: '20px', lineHeight: '1.8', fontSize: '16px' }}>
        <p>
          个性化VAD（Voice Activity Detection，语音活动检测）服务是一个智能的语音识别功能，
          能够根据用户的个性化特征和语音模式，更准确地检测和识别语音活动。
        </p>
        <p>
          该服务通过分析用户的语音特征、说话习惯和环境背景，提供个性化的语音活动检测方案，
          提高语音识别的准确性和用户体验。
        </p>
        <p>
          主要功能包括：
        </p>
        <ul>
          <li>基于用户特征的个性化模型训练</li>
          <li>自适应语音活动检测</li>
          <li>实时语音识别优化</li>
          <li>多场景语音处理支持</li>
        </ul>
      </div>
    </div>
  );
};

export default PersonalizedVad;

