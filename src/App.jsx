import React, { useState, useEffect } from 'react';
import { Camera, Upload, Settings, Download, Eye, Loader2, Key, LogOut } from 'lucide-react';

const API_BASE = "https://ai.gitee.com/v1";

export default function OCRApp() {
  const [user, setUser] = useState(null);
  const [apiKey, setApiKey] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [prompt, setPrompt] = useState('<image>\\n<|grounding|>Convert the document to markdown.');
  const [result, setResult] = useState('');
  const [resultImage, setResultImage] = useState('');
  const [loading, setLoading] = useState(false);
  const [taskStatus, setTaskStatus] = useState('');
  const [history, setHistory] = useState([]);

  // 模拟用户登录状态（实际应用中需要集成Supabase Auth）
  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      // 从localStorage加载API Key
      const savedKey = localStorage.getItem('deepseek_api_key');
      if (savedKey) {
        setApiKey(savedKey);
      }
      
      // 加载历史记录
      const savedHistory = localStorage.getItem('ocr_history');
      if (savedHistory) {
        setHistory(JSON.parse(savedHistory));
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const saveApiKey = () => {
    localStorage.setItem('deepseek_api_key', apiKey);
    setShowSettings(false);
    alert('API Key 已保存');
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
      throw new Error('上传失败');
    }

    return await response.json();
  };

  const pollTask = async (taskId) => {
    const maxAttempts = 180; // 30分钟，每10秒检查一次
    let attempts = 0;

    while (attempts < maxAttempts) {
      attempts++;
      setTaskStatus(`检查任务状态 [${attempts}/${maxAttempts}]...`);

      const response = await fetch(`${API_BASE}/task/${taskId}`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      });

      const result = await response.json();

      if (result.error) {
        throw new Error(`${result.error}: ${result.message || '未知错误'}`);
      }

      const status = result.status || 'unknown';
      setTaskStatus(`状态: ${status}`);

      if (status === 'success') {
        if (result.output && result.output.file_url) {
          const duration = (result.completed_at - result.started_at) / 1000;
          setTaskStatus(`✅ 完成！用时: ${duration.toFixed(2)}秒`);
          
          // 获取结果内容
          const contentResponse = await fetch(result.output.file_url);
          const content = await contentResponse.text();
          setResult(content);

          // 保存到历史记录
          const newHistory = [{
            id: taskId,
            timestamp: new Date().toISOString(),
            preview: imagePreview,
            result: content
          }, ...history.slice(0, 9)];
          setHistory(newHistory);
          localStorage.setItem('ocr_history', JSON.stringify(newHistory));

          return result;
        }
      } else if (status === 'failed' || status === 'cancelled') {
        throw new Error(`任务${status === 'failed' ? '失败' : '已取消'}`);
      }

      await new Promise(resolve => setTimeout(resolve, 10000)); // 等待10秒
    }

    throw new Error('任务超时');
  };

  const handleOCR = async () => {
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
      const uploadResult = await uploadToGitee(image);
      const taskId = uploadResult.task_id;

      if (!taskId) {
        throw new Error('未获取到任务ID');
      }

      setTaskStatus(`任务ID: ${taskId}`);
      await pollTask(taskId);
    } catch (error) {
      alert(`错误: ${error.message}`);
      setTaskStatus('');
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
    setImagePreview(item.preview);
    setResult(item.result);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Camera className="w-8 h-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-800">布偶快扫</h1>
          </div>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
          >
            <Settings className="w-5 h-5" />
            <span>设置</span>
          </button>
        </div>
      </header>

      {/* Settings Panel */}
      {showSettings && (
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-blue-500">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Key className="w-5 h-5" />
              API 设置（请不要在公用电脑上填入你的付费api-key）
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

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Upload Section */}
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

          {/* Result Section */}
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

        {/* History Section */}
        {history.length > 0 && (
          <div className="mt-8 bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">历史记录</h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {history.map((item, index) => (
                <div
                  key={item.id}
                  onClick={() => loadHistoryItem(item)}
                  className="cursor-pointer border border-gray-200 rounded-lg p-2 hover:border-blue-500 hover:shadow-md transition"
                >
                  <img
                    src={item.preview}
                    alt={`History ${index + 1}`}
                    className="w-full h-24 object-cover rounded"
                  />
                  <p className="text-xs text-gray-500 mt-2 truncate">
                    {new Date(item.timestamp).toLocaleString('zh-CN')}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-4 py-6 text-center text-sm text-gray-500">
        <p>水木心育©️旗下基于deepseek-ocr的便民ocr服务</p>
        <p>津ICP备2025035405号-1</p>
      </footer>
    </div>
  );
}