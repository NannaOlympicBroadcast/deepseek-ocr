import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { Camera, Upload, Settings, Download, Eye, Loader2, Key, LogOut, LogIn } from 'lucide-react';

const API_BASE = "https://ai.gitee.com/v1";

export default function App() {
  const [user, setUser] = useState(null);
  const [apiKey, setApiKey] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [prompt, setPrompt] = useState('<image>\\n<|grounding|>Convert the document to markdown.');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [taskStatus, setTaskStatus] = useState('');
  const [history, setHistory] = useState([]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadUserData(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadUserData(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadUserData = async (userId) => {
    try {
      const { data: keyData } = await supabase
        .from('user_api_keys')
        .select('api_key')
        .eq('user_id', userId)
        .single();

      if (keyData) {
        setApiKey(keyData.api_key);
      }

      const { data: historyData } = await supabase
        .from('ocr_history')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (historyData) {
        setHistory(historyData);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/`
      }
    });
    if (error) alert(error.message);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setApiKey('');
    setHistory([]);
    setResult('');
    setImagePreview('');
  };

  const saveApiKey = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('user_api_keys')
        .upsert({
          user_id: user.id,
          api_key: apiKey,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      
      setShowSettings(false);
      alert('API Key 已保存');
    } catch (error) {
      alert(`保存失败: ${error.message}`);
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadToGitee = async (file) => {
    const formData = new FormData();
    formData.append('model', 'DeepSeek-OCR');
    formData.append('prompt', prompt);
    formData.append('model_size', 'Gundam');
    formData.append('image', file);

    const response = await fetch(`${API_BASE}/async/images/ocr`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'X-Failover-Enabled': 'true'
      },
      body: formData
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`上传失败 (${response.status}): ${errorText}`);
    }

    return await response.json();
  };

  const pollTask = async (taskId) => {
    const maxAttempts = 180;
    let attempts = 0;

    while (attempts < maxAttempts) {
      attempts++;
      const statusMsg = `检查任务状态 [${attempts}/${maxAttempts}]...`;
      console.log(statusMsg);
      setTaskStatus(statusMsg);

      try {
        const response = await fetch(`${API_BASE}/task/${taskId}`, {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'X-Failover-Enabled': 'true'
          }
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        console.log('完整任务响应:', JSON.stringify(result, null, 2));

        if (result.error) {
          throw new Error(`${result.error}: ${result.message || 'Unknown error'}`);
        }

        const status = result.status || 'unknown';
        console.log('任务状态:', status);
        setTaskStatus(`状态: ${status} [${attempts}/${maxAttempts}]`);

        if (status === 'success') {
          let content = '';
          let hasResult = false;

          // 方案1: 有 file_url (需要下载)
          if (result.output && result.output.file_url) {
            console.log('📎 发现 file_url:', result.output.file_url);
            setTaskStatus('✅ 正在下载结果...');
            
            try {
              const contentResponse = await fetch(result.output.file_url);
              if (contentResponse.ok) {
                content = await contentResponse.text();
                hasResult = true;
                console.log('📥 从 file_url 获取内容成功，长度:', content.length);
              }
            } catch (e) {
              console.error('从 file_url 下载失败:', e);
            }
          }

          // 方案2: 直接在 output 中有内容
          if (!hasResult && result.output) {
            if (result.output.text) {
              content = result.output.text;
              hasResult = true;
              console.log('📝 从 output.text 获取内容');
            } else if (result.output.markdown) {
              content = result.output.markdown;
              hasResult = true;
              console.log('📝 从 output.markdown 获取内容');
            } else if (result.output.content) {
              content = result.output.content;
              hasResult = true;
              console.log('📝 从 output.content 获取内容');
            }
          }

          // 方案3: 直接在 result 字段
          if (!hasResult && result.result) {
            content = typeof result.result === 'string' 
              ? result.result 
              : JSON.stringify(result.result, null, 2);
            hasResult = true;
            console.log('📝 从 result 字段获取内容');
          }

          // 方案4: 在 data 字段
          if (!hasResult && result.data) {
            content = typeof result.data === 'string'
              ? result.data
              : JSON.stringify(result.data, null, 2);
            hasResult = true;
            console.log('📝 从 data 字段获取内容');
          }

          if (hasResult && content) {
            const duration = result.completed_at && result.started_at
              ? ((result.completed_at - result.started_at) / 1000).toFixed(2)
              : '未知';
            
            console.log('✅ OCR 结果内容预览:', content.substring(0, 200));
            setResult(content);
            setTaskStatus(`✅ 完成！用时: ${duration} 秒`);

            // 保存到历史记录
            if (user) {
              try {
                await supabase.from('ocr_history').insert({
                  user_id: user.id,
                  task_id: taskId,
                  image_url: imagePreview,
                  result: content,
                  prompt: prompt
                });
                loadUserData(user.id);
              } catch (dbError) {
                console.error('保存到数据库失败:', dbError);
              }
            }

            return result;
          } else {
            console.error('⚠️ 任务成功但没有找到结果内容');
            console.error('完整响应:', result);
            setTaskStatus('⚠️ 任务完成但未找到结果内容');
            
            const debugInfo = `任务完成，但未找到标准格式的结果。\n\n完整响应：\n${JSON.stringify(result, null, 2)}`;
            setResult(debugInfo);
            
            return result;
          }
        } 
        else if (status === 'failed' || status === 'cancelled') {
          const errorMsg = result.message || result.error_message || '未知错误';
          console.error('❌ 任务失败:', errorMsg);
          throw new Error(`任务${status === 'failed' ? '失败' : '已取消'}: ${errorMsg}`);
        }
        else {
          console.log('⏳ 任务处理中，10秒后重试...');
          await new Promise(resolve => setTimeout(resolve, 10000));
          continue;
        }
        
      } catch (error) {
        console.error('❌ 轮询错误:', error);
        throw error;
      }
    }

    throw new Error('⏰ 任务超时（等待时间超过 30 分钟）');
  };

  const handleOCR = async () => {
    if (!user) {
      alert('请先登录');
      return;
    }

    if (!apiKey) {
      alert('请先设置 API Key');
      setShowSettings(true);
      return;
    }

    if (!image) {
      alert('请先上传图片');
      return;
    }

    setLoading(true);
    setResult('');
    setTaskStatus('正在创建任务...');

    try {
      console.log('🚀 开始上传图片...');
      const uploadResult = await uploadToGitee(image);
      console.log('✅ 上传结果:', uploadResult);
      
      const taskId = uploadResult.task_id;

      if (!taskId) {
        throw new Error('未获取到任务ID');
      }

      console.log('🆔 任务 ID:', taskId);
      setTaskStatus(`任务ID: ${taskId}，开始轮询...`);
      await pollTask(taskId);
      
    } catch (error) {
      console.error('❌ OCR 处理错误:', error);
      alert(`错误: ${error.message}`);
      setTaskStatus(`❌ 错误: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const downloadResult = () => {
    const blob = new Blob([result], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ocr-result.md';
    a.click();
    URL.revokeObjectURL(url);
  };

  const loadHistoryItem = (item) => {
    setImagePreview(item.image_url);
    setResult(item.result);
    setPrompt(item.prompt);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-2xl p-12 max-w-md w-full text-center">
          <Camera className="w-20 h-20 text-blue-600 mx-auto mb-6" />
          <h1 className="text-3xl font-bold text-gray-800 mb-4">DeepSeek OCR</h1>
          <p className="text-gray-600 mb-8">使用 Google 账号登录以开始使用 OCR 服务</p>
          <button
            onClick={signInWithGoogle}
            className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition shadow-sm"
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <span className="font-medium text-gray-700">使用 Google 登录</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Camera className="w-8 h-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-800">DeepSeek OCR</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600 hidden md:inline">{user.email}</span>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
            >
              <Settings className="w-5 h-5" />
              <span className="hidden md:inline">设置</span>
            </button>
            <button
              onClick={signOut}
              className="flex items-center gap-2 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition"
            >
              <LogOut className="w-5 h-5" />
              <span className="hidden md:inline">退出</span>
            </button>
          </div>
        </div>
      </header>

      {showSettings && (
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-blue-500">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Key className="w-5 h-5" />
              API 设置
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Gitee AI API Key
                </label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="输入你的 API Key"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={saveApiKey}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  保存
                </button>
                <button
                  onClick={() => setShowSettings(false)}
                  className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Upload className="w-5 h-5 text-blue-600" />
              上传图片
            </h2>
            
            <div className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 transition cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  id="image-upload"
                />
                <label htmlFor="image-upload" className="cursor-pointer">
                  {imagePreview ? (
                    <img src={imagePreview} alt="Preview" className="max-h-64 mx-auto rounded-lg" />
                  ) : (
                    <div className="space-y-2">
                      <Upload className="w-12 h-12 mx-auto text-gray-400" />
                      <p className="text-gray-600">点击上传图片</p>
                      <p className="text-sm text-gray-400">支持 JPG, PNG, WEBP</p>
                    </div>
                  )}
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  OCR 提示词
                </label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <button
                onClick={handleOCR}
                disabled={loading || !image || !apiKey}
                className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    处理中...
                  </>
                ) : (
                  <>
                    <Eye className="w-5 h-5" />
                    开始识别
                  </>
                )}
              </button>

              {taskStatus && (
                <div className="p-3 bg-blue-50 rounded-lg text-sm text-blue-800">
                  {taskStatus}
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Eye className="w-5 h-5 text-green-600" />
                识别结果
              </h2>
              {result && (
                <button
                  onClick={downloadResult}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                >
                  <Download className="w-4 h-4" />
                  下载
                </button>
              )}
            </div>

            <div className="border border-gray-200 rounded-lg p-4 min-h-96 max-h-96 overflow-auto bg-gray-50 font-mono text-sm">
              {result ? (
                <div className="whitespace-pre-wrap text-gray-800">
                  {result}
                </div>
              ) : loading ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                  <Loader2 className="w-12 h-12 animate-spin mb-4" />
                  <p>正在识别中，请稍候...</p>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-gray-400">识别结果将显示在这里</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {history.length > 0 && (
          <div className="mt-8 bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">历史记录</h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {history.map((item) => (
                <div
                  key={item.id}
                  onClick={() => loadHistoryItem(item)}
                  className="cursor-pointer border border-gray-200 rounded-lg p-2 hover:border-blue-500 hover:shadow-md transition"
                >
                  <img
                    src={item.image_url}
                    alt="History"
                    className="w-full h-24 object-cover rounded"
                  />
                  <p className="text-xs text-gray-500 mt-2 truncate">
                    {new Date(item.created_at).toLocaleString('zh-CN')}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      <footer className="max-w-7xl mx-auto px-4 py-6 text-center text-sm text-gray-500">
        <p>使用 DeepSeek OCR API 提供服务</p>
      </footer>
    </div>
  );
}