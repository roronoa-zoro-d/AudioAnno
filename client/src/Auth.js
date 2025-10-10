import React, { useState } from 'react';
import { useUser } from './UserContext';
import { useNavigate } from 'react-router-dom';
import { API_HOST } from './utils/apiService';

const Auth = () => {
  const [mode, setMode] = useState('login');
  const [usernameInput, setUsernameInput] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');
  const { setUsername } = useUser();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg('');
    // 使用 API_HOST 统一管理后端地址
    const url = mode === 'login'
      ? `${API_HOST}/api/login`
      : `${API_HOST}/api/register`;
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: usernameInput, password })
      });
      const data = await res.json();
      if (res.ok && data.status === 'success') {
        setMsg(mode === 'login' ? '登录成功' : '注册成功');
        if (mode === 'login') {
          setUsername(usernameInput); // 关键：设置全局用户名
          navigate('/datasetManager/dataset');
        }
      } else {
        setMsg(data.detail || data.message || (mode === 'login' ? '登录失败' : '注册失败'));
      }
    } catch (err) {
      setMsg('网络错误');
    }
  };

  return (
    <div className="auth-page" style={{ maxWidth: 320, margin: '60px auto', padding: 24, border: '1px solid #eee', borderRadius: 8 }}>
      <h2>{mode === 'login' ? '用户登录' : '用户注册'}</h2>
      <form onSubmit={handleSubmit}>
        <input
          placeholder="用户名"
          value={usernameInput}
          onChange={e => setUsernameInput(e.target.value)}
          style={{ width: '100%', marginBottom: 12, padding: 8 }}
        />
        <input
          placeholder="密码"
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          style={{ width: '100%', marginBottom: 12, padding: 8 }}
        />
        <button type="submit" style={{ width: '100%', padding: 8 }}>
          {mode === 'login' ? '登录' : '注册'}
        </button>
      </form>
      <div style={{ color: 'red', marginTop: 8 }}>{msg}</div>
      <div style={{ marginTop: 16 }}>
        {mode === 'login' ? (
          <span>没有账号？<button onClick={() => setMode('register')} style={{ border: 'none', background: 'none', color: '#1976d2', cursor: 'pointer' }}>去注册</button></span>
        ) : (
          <span>已有账号？<button onClick={() => setMode('login')} style={{ border: 'none', background: 'none', color: '#1976d2', cursor: 'pointer' }}>去登录</button></span>
        )}
      </div>
    </div>
  );
};

export default Auth;