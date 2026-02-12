// Navigation.js
import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import './Navigation.css';

const Navigation = ({ collapsed, setCollapsed }) => {
  const location = useLocation();
  
  const toggleCollapse = () => {
    setCollapsed(!collapsed);
  };

  // 检查当前路径是否活跃
  const isActivePath = (path) => {
    return location.pathname.startsWith(path);
  };

  return (
    <div className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <h2>{collapsed ? 'M' : '语音平台'}</h2>
        <button className="toggle-btn" onClick={toggleCollapse}>
          {collapsed ? '→' : '←'}
        </button>
      </div>
      
      <nav className="nav-menu">

         <div className={`nav-group ${isActivePath('/speech-annotation') ? 'active' : ''}`}>
          <div className="nav-title">语音标注</div>
          <div className="nav-subitems">
            <NavLink to="/speech-annotation/long" className="nav-item">
              <span className="icon">🎙️</span>
              {!collapsed && <span>长音频标注</span>}
            </NavLink>
            <NavLink to="/speech-annotation/short" className="nav-item">
              <span className="icon">🔊</span>
              {!collapsed && <span>短音频标注</span>}
            </NavLink>
          </div>
        </div>

        <div className={`nav-group ${isActivePath('/speech-show') ? 'active' : ''}`}>
          <div className="nav-title">音频标注预览</div>
          <div className="nav-subitems">
            <NavLink to="/speech-show/long" className="nav-item">
              <span className="icon">🎙️</span>
              {!collapsed && <span>长音频预览</span>}
            </NavLink>
            <NavLink to="/speech-show/short" className="nav-item">
              <span className="icon">🔊</span>
              {!collapsed && <span>短音频预览</span>}
            </NavLink>
          </div>
        </div>
        
        <div className={`nav-group ${isActivePath('/speech-analysis') ? 'active' : ''}`}>
          <div className="nav-title">语音分析</div>
          <div className="nav-subitems">
            <NavLink to="/speech-analysis/wer" className="nav-item">
              <span className="icon">📊</span>
              {!collapsed && <span>字错率分析</span>}
            </NavLink>
          </div>
        </div>

        
        <div className={`nav-group ${isActivePath('/datasetManager') ? 'active' : ''}`}>
          <div className="nav-title">数据集管理</div>
          <div className="nav-subitems">
            <NavLink to="/datasetManager/dataset" className="nav-item">
              <span className="icon">🗂️</span>
              {!collapsed && <span>数据集</span>}
            </NavLink>
          </div>
        </div>
           

        <div className={`nav-group ${isActivePath('/badcase') ? 'active' : ''}`}>
          <div className="nav-title">badcase分析</div>
          <div className="nav-subitems">
            <NavLink to="/badcase/upload" className="nav-item">
              <span className="icon">⬆️</span>
              {!collapsed && <span>badcase数据上传</span>}
            </NavLink>
            <NavLink to="/badcase/analysis" className="nav-item">
              <span className="icon">📈</span>
              {!collapsed && <span>badcase数据分析</span>}
            </NavLink>
            <NavLink to="/badcase/overview" className="nav-item">
              <span className="icon">👁️</span>
              {!collapsed && <span>badcase数据总览</span>}
            </NavLink>
          </div>
        </div>

        <div className={`nav-group ${isActivePath('/speech-recognition') ? 'active' : ''}`}>
          <div className="nav-title">语音识别服务</div>
          <div className="nav-subitems">
            <NavLink to="/speech-recognition/personalized-vad" className="nav-item">
              <span className="icon">🎯</span>
              {!collapsed && <span>个性化vad</span>}
            </NavLink>
            <NavLink to="/speech-recognition/background-voice-filter" className="nav-item">
              <span className="icon">🔇</span>
              {!collapsed && <span>背景人声过滤</span>}
            </NavLink>
          </div>
        </div>
      </nav>
    </div>
  );
};

export default Navigation;