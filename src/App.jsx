import React, { useState, useEffect } from 'react';
import { Camera, Upload, Settings, Download, Eye, Loader2, Key, LogOut, AlertCircle } from 'lucide-react';

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
  const [debugInfo, setDebugInfo] = useState('');
  const [showDebug, setShowDebug] = useState(false);

  // 模拟用户登录状态（实际应用中需要集成Supabase Auth）
  useEffect(() => {
    loadUserData();
  }, []);

  const addDebugInfo = (info) => {
    const timestamp = new Date().toLocaleTimeString();
    setDebugInfo(prev => `[${timestamp}] ${info}\n${prev}`);
  };

  const loadUserData = async () => {
    try {
      // 从localStorage加载API Key
      const savedKey = localStorage.getItem('deepseek_api_key');
      if (savedKey) {
        setApiKey(savedKey);
        addDebugInfo('API Key已从本地存储加载');
      }
      
      // 加载历史记录
      const savedHistory = localStorage.getItem('ocr_history');
      if (savedHistory) {
        setHistory(JSON.parse(savedHistory));
        addDebugInfo('历史记录已加载');
      }
    } catch (error) {
      console.error('Error loading data:', error);
      addDebugInfo(`加载数据失败: ${error.message}`);
    }
  };

  const saveApiKey = () => {
    localStorage.setItem('deepseek_api_key', apiKey);
    setShowSettings(false);
    addDebugInfo('API Key已保存');
    alert('API Key 已保存');
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      addDebugInfo(`图片已选择: ${file.name}, 大小: ${(file.size / 1024 / 1024).toFixed(2)}MB`);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
        addDebugInfo('图片预览生成成功');
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadToGitee = async (file) => {
    addDebugInfo('开始上传图片到Gitee AI');
    const formData = new FormData();
    formData.append('model', 'DeepSeek-OCR');
    formData.append('prompt', prompt);
    formData.append('model_size', 'Gundam');
    formData.append('image', file);

    addDebugInfo(`请求参数: model=DeepSeek-OCR, prompt=${prompt.slice(0, 50)}...`);

    const response = await fetch(`${API_BASE}/async/images/ocr`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'X-Failover-Enabled': 'true'
      },
      body: formData
    });

    addDebugInfo(`上传响应状态: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      addDebugInfo(`上传失败详情: ${errorText}`);
      throw new Error(`上传失败: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    addDebugInfo(`上传响应数据: ${JSON.stringify(result, null, 2)}`);
    return result;
  };

  const pollTask = async (taskId) => {
    const maxAttempts = 180; // 30分钟，每10秒检查一次
    let attempts = 0;

    addDebugInfo(`开始轮询任务: ${taskId}`);

    while (attempts < maxAttempts) {
      attempts++;
      setTaskStatus(`检查任务状态 [${attempts}/${maxAttempts}]...`);
      addDebugInfo(`轮询尝试 ${attempts}/${maxAttempts}`);

      try {
        const response = await fetch(`${API_BASE}/task/${taskId}`, {
          headers: {
            'Authorization': `Bearer ${apiKey}`
          }
        });

        addDebugInfo(`轮询响应状态: ${response.status}`);

        if (!response.ok) {
          const errorText = await response.text();
          addDebugInfo(`轮询请求失败: ${errorText}`);
          throw new Error(`请求失败: ${response.status} - ${errorText}`);
        }

        const result = await response.json();
        addDebugInfo(`轮询响应数据: ${JSON.stringify(result, null, 2)}`);

        if (result.error) {
          addDebugInfo(`任务错误: ${result.error} - ${result.message}`);
          throw new Error(`${result.error}: ${result.message || '未知错误'}`);
        }

        const status = result.status || 'unknown';
        setTaskStatus(`状态: ${status}`);
        addDebugInfo(`任务状态: ${status}`);

        if (status === 'success') {
          addDebugInfo(`任务成功完成，检查输出...`);
          
          if (result.output) {
            addDebugInfo(`输出对象: ${JSON.stringify(result.output, null, 2)}`);
            
            // 尝试多种可能的字段名
            let content = null;
            let resultImageUrl = null;
            
            // 优先检查 text_result（DeepSeek OCR API 的主要字段）
            if (result.output.text_result) {
              content = result.output.text_result;
              addDebugInfo(`找到text_result字段，长度: ${content.length}`);
            } 
            // 检查其他可能的文本字段
            else if (result.output.content) {
              content = result.output.content;
              addDebugInfo(`找到content字段，长度: ${content.length}`);
            } else if (result.output.text) {
              content = result.output.text;
              addDebugInfo(`找到text字段，长度: ${content.length}`);
            }
            // 检查是否有文件URL需要获取
            else if (result.output.file_url) {
              addDebugInfo(`找到file_url: ${result.output.file_url}`);
              try {
                const contentResponse = await fetch(result.output.file_url);
                addDebugInfo(`文件响应状态: ${contentResponse.status}`);
                
                if (contentResponse.ok) {
                  const contentType = contentResponse.headers.get('content-type');
                  addDebugInfo(`文件内容类型: ${contentType}`);
                  
                  if (contentType && contentType.includes('application/json')) {
                    const jsonContent = await contentResponse.json();
                    content = JSON.stringify(jsonContent, null, 2);
                    addDebugInfo(`获取到JSON内容，长度: ${content.length}`);
                  } else {
                    content = await contentResponse.text();
                    addDebugInfo(`获取到文本内容，长度: ${content.length}`);
                  }
                } else {
                  addDebugInfo(`获取文件内容失败: ${contentResponse.status}`);
                }
              } catch (fetchError) {
                addDebugInfo(`获取文件内容时出错: ${fetchError.message}`);
              }
            }
            
            // 获取结果图片URL（如果有）
            if (result.output.result_image) {
              resultImageUrl = result.output.result_image;
              addDebugInfo(`找到结果图片URL: ${resultImageUrl}`);
              setResultImage(resultImageUrl);
            }
            
            if (content) {
              const duration = result.completed_at && result.started_at ? 
                (result.completed_at - result.started_at) / 1000 : 0;
              setTaskStatus(`✅ 完成！${duration > 0 ? `用时: ${duration.toFixed(2)}秒` : ''}`);
              
              setResult(content);
              addDebugInfo(`结果已设置，内容长度: ${content.length}`);
              addDebugInfo(`结果预览: ${content.slice(0, 200)}...`);

              // 保存到历史记录
              const newHistory = [{
                id: taskId,
                timestamp: new Date().toISOString(),
                preview: imagePreview,
                result: content,
                resultImage: resultImageUrl
              }, ...history.slice(0, 9)];
              setHistory(newHistory);
              localStorage.setItem('ocr_history', JSON.stringify(newHistory));
              addDebugInfo('结果已保存到历史记录');

              return result;
            } else {
              addDebugInfo('警告: 未找到任何内容字段');
              addDebugInfo(`可用字段: ${Object.keys(result.output).join(', ')}`);
              setResult('未找到识别结果内容\n\n可用字段：' + Object.keys(result.output).join(', '));
            }
          } else {
            addDebugInfo('警告: 响应中没有output字段');
            setResult('响应格式异常：缺少output字段');
          }
        } else if (status === 'failed' || status === 'cancelled') {
          const errorMessage = `任务${status === 'failed' ? '失败' : '已取消'}`;
          addDebugInfo(errorMessage);
          throw new Error(errorMessage);
        }

        await new Promise(resolve => setTimeout(resolve, 10000)); // 等待10秒
      } catch (pollError) {
        addDebugInfo(`轮询过程中出错: ${pollError.message}`);
        throw pollError;
      }
    }

    const timeoutError = '任务超时';
    addDebugInfo(timeoutError);
    throw new Error(timeoutError);
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
    setResultImage('');
    setTaskStatus('正在创建任务...');
    setDebugInfo(''); // 清空调试信息

    try {
      addDebugInfo('开始OCR处理');
      const uploadResult = await uploadToGitee(image);
      const taskId = uploadResult.task_id;

      if (!taskId) {
        addDebugInfo('错误: 未获取到任务ID');
        throw new Error('未获取到任务ID');
      }

      addDebugInfo(`获取到任务ID: ${taskId}`);
      setTaskStatus(`任务ID: ${taskId}`);
      await pollTask(taskId);
    } catch (error) {
      addDebugInfo(`处理失败: ${error.message}`);
      alert(`错误: ${error.message}`);
      setTaskStatus('');
    } finally {
      setLoading(false);
      addDebugInfo('OCR处理结束');
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
    addDebugInfo('结果已下载');
  };

  const loadHistoryItem = (item) => {
    setImagePreview(item.preview);
    setResult(item.result);
    if (item.resultImage) {
      setResultImage(item.resultImage);
    }
    addDebugInfo(`加载历史记录: ${item.id}`);
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
          <div className="flex gap-2">
            <button
              onClick={() => setShowDebug(!showDebug)}
              className="flex items-center gap-2 px-3 py-2 bg-yellow-100 hover:bg-yellow-200 rounded-lg transition text-sm"
            >
              <AlertCircle className="w-4 h-4" />
              调试
            </button>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
            >
              <Settings className="w-5 h-5" />
              <span>设置</span>
            </button>
          </div>
        </div>
      </header>

      {/* Debug Panel */}
      {showDebug && (
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="bg-yellow-50 rounded-lg shadow-lg p-4 border-l-4 border-yellow-500">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-lg font-semibold text-yellow-800">调试信息</h2>
              <button
                onClick={() => setDebugInfo('')}
                className="text-sm px-3 py-1 bg-yellow-200 hover:bg-yellow-300 rounded"
              >
                清空
              </button>
            </div>
            <pre className="text-xs bg-white p-3 rounded border max-h-64 overflow-auto font-mono">
              {debugInfo || '暂无调试信息'}
            </pre>
          </div>
        </div>
      )}

      {/* Settings Panel */}
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
                <p>从ai.gitee.com获取</p>
                <p>请勿将付费密钥保存在公共电脑上</p>
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

            {resultImage && (
              <div className="mb-4 p-2 bg-gray-100 rounded-lg">
                <p className="text-xs text-gray-600 mb-2">标注结果图片：</p>
                <img 
                  src={resultImage} 
                  alt="Result visualization" 
                  className="max-h-48 mx-auto rounded border border-gray-300"
                />
              </div>
            )}

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
        <p>水木心育©️旗下的便民OCR服务</p>
        <p>津ICP备2025035405号-1</p>
      </footer>
    </div>
  );
}