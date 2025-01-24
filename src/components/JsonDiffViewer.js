import React, { useState, useEffect } from 'react';
import { diff } from 'deep-diff';
import JSONView from 'react-json-view-lite';
import './JsonDiffViewer.css';

function JsonDiffViewer() {
  const [json1, setJson1] = useState('');
  const [json2, setJson2] = useState('');
  const [differences, setDifferences] = useState([]);
  const [showOrderChanges, setShowOrderChanges] = useState(false);
  const [validationError, setValidationError] = useState({
    json1: false,
    json2: false
  });
  const [darkMode, setDarkMode] = useState(false);

  // 定义公共样式
  const textareaStyle = {
    width: '100%',
    minHeight: '200px',
    padding: '12px',
    fontFamily: 'monospace',
    fontSize: '14px',
    lineHeight: '1.5',
    border: '1px solid #ddd',
    borderRadius: '4px',
    resize: 'vertical'
  };

  const errorTextareaStyle = {
    ...textareaStyle,
    border: '2px solid #dc3545'
  };

  const safeParse = (json) => {
    try {
      return JSON.parse(json);
    } catch {
      return null;
    }
  };

  const validateJSON = (value) => {
    try {
      JSON.parse(value);
      return true;
    } catch {
      return false;
    }
  };

  const handleJsonChange = (setter, field) => (e) => {
    const value = e.target.value;
    setter(value);
    setValidationError(prev => ({
      ...prev,
      [field]: !validateJSON(value)
    }));
  };

  const compareJSON = (json1, json2) => {
    try {
      const obj1 = JSON.parse(json1);
      const obj2 = JSON.parse(json2);
      return []; // 返回空数组作为默认值
    } catch {
      return []; // 即使出错也返回空数组
    }
  };

  const handleCompare = () => {
    if (json1.trim() === '' && json2.trim() === '') {
      alert('请在两侧输入框中输入需要比较的JSON');
      return;
    } else if (json1.trim() === '') {
      alert('请在左侧输入原始JSON');
      return;
    } else if (json2.trim() === '') {
      alert('请在右侧输入新JSON');
      return;
    }

    if (validationError.json1 || validationError.json2) {
      const errors = [];
      if (validationError.json1) errors.push('左侧JSON格式错误');
      if (validationError.json2) errors.push('右侧JSON格式错误');
      alert(`请修正以下错误：\n${errors.join('\n')}`);
      return;
    }
    
    const diffs = compareJSON(json1, json2);
    setDifferences(diffs || []);
  };

  const processDifferences = (changes) => {
    const reorderMap = new Map();
    
    // 第一步：识别所有可能的顺序变化
    changes.forEach(change => {
      if (change.kind === 'A' && isArrayReorder(change)) {
        const pathKey = change.path.join('.');
        if (!reorderMap.has(pathKey)) {
          reorderMap.set(pathKey, {
            type: 'reorder',
            path: change.path.join(' > '),
            oldArray: JSON.parse(json1)[change.path[0]],
            newArray: JSON.parse(json2)[change.path[0]]
          });
        }
      }
    });

    // 第二步：处理常规变化
    const regularChanges = changes.reduce((acc, change) => {
      const pathKey = change.path.join('.');
      
      // 如果是已识别的顺序变化则跳过
      if (reorderMap.has(pathKey)) return acc;

      // 判断数组元素变化类型
      const changeType = change.item.kind === 'N' ? 'added' : 
                       change.item.kind === 'D' ? 'deleted' : 'updated';
      acc.push({
        type: changeType,
        path: `${change.path.join(' > ')}[${change.index}]`,
        oldValue: change.item.lhs,
        newValue: change.item.rhs
      });
      return acc;
    }, []);

    // 第三步：合并结果
    return [
      ...regularChanges,
      ...Array.from(reorderMap.values())
    ];
  };

  const isArrayReorder = (change) => {
    try {
      const path = change.path[0];
      const oldArray = JSON.parse(json1)[path] || [];
      const newArray = JSON.parse(json2)[path] || [];
      
      // 排除非数组情况
      if (!Array.isArray(oldArray) || !Array.isArray(newArray)) return false;
      
      // 创建元素指纹映射
      const createFingerprintMap = (arr) => {
        const map = new Map();
        arr.forEach(item => {
          const key = JSON.stringify(item);
          map.set(key, (map.get(key) || 0) + 1);
        });
        return map;
      };

      const oldMap = createFingerprintMap(oldArray);
      const newMap = createFingerprintMap(newArray);
      
      // 比较元素组成
      if (oldMap.size !== newMap.size) return false;
      for (const [key, count] of oldMap) {
        if (newMap.get(key) !== count) return false;
      }
      
      // 最终确认顺序不同
      return JSON.stringify(oldArray) !== JSON.stringify(newArray);
    } catch {
      return false;
    }
  };

  // 新增行号组件
  const LineNumbers = ({ content }) => {
    const lineCount = content.split('\n').length;
    return (
      <div style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: '30px',
        textAlign: 'right',
        paddingRight: '8px',
        color: '#666',
        backgroundColor: '#f5f5f5',
        height: '100%',
        overflow: 'hidden'
      }}>
        {Array.from({ length: lineCount }).map((_, i) => (
          <div key={i} style={{ lineHeight: '20px' }}>{i + 1}</div>
        ))}
      </div>
    );
  };

  // 修复统计变量声明
  const diffStats = differences?.reduce((stats, diff) => {
    stats[diff.type] = (stats[diff.type] || 0) + 1;
    return stats;
  }, {}) || {};

  // 动态样式变量
  const theme = {
    light: {
      added: '#28a745',
      deleted: '#dc3545',
      updated: '#ffc107',
      background: '#ffffff',
      text: '#212529'
    },
    dark: {
      added: '#10b981',
      deleted: '#ef4444',
      updated: '#f59e0b',
      background: '#1a1a1a',
      text: '#e5e7eb'
    }
  };

  // 应用主题
  const currentTheme = darkMode ? theme.dark : theme.light;

  // 新增格式化方法
  const formatJSON = (jsonString) => {
    try {
      const parsed = JSON.parse(jsonString);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return jsonString;
    }
  };

  // 替换原有的JSONPreview组件
  const JSONPreview = ({ jsonString }) => {
    if (jsonString.trim() === '') {
      return (
        <div style={{ 
          color: '#666',
          padding: '12px',
          fontStyle: 'italic'
        }}>
          等待输入...
        </div>
      );
    }
    
    try {
      const parsed = JSON.parse(jsonString);
      return (
        <pre style={{ 
          backgroundColor: '#f5f5f5',
          padding: '12px',
          borderRadius: '4px',
          overflowX: 'auto'
        }}>
          {JSON.stringify(parsed, null, 2)}
        </pre>
      );
    } catch {
      return (
        <div style={{ 
          color: '#dc3545',
          padding: '12px',
          backgroundColor: '#ffeef0',
          borderRadius: '4px'
        }}>
          ⚠️ 无效的JSON格式
        </div>
      );
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ 
        marginBottom: '20px',
        padding: '12px',
        backgroundColor: '#f8f9fa',
        borderRadius: '4px'
      }}>
        <h3>使用说明</h3>
        <ol style={{ margin: '8px 0', paddingLeft: '20px' }}>
          <li>在左侧输入原始JSON</li>
          <li>在右侧输入修改后的JSON</li>
          <li>点击"比较JSON"查看差异</li>
        </ol>
      </div>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr 1fr', 
        gap: '40px',  // 增加间距
        padding: '20px',  // 增加内边距
        backgroundColor: '#f8f9fa',  // 添加背景色
        borderRadius: '8px',  // 圆角
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'  // 添加阴影效果
      }}>
        <div style={{ 
          padding: '16px', 
          backgroundColor: '#fff', 
          borderRadius: '4px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
        //   width: '100%'  // 减小宽度
        }}>
          <h4 style={{ marginBottom: '12px' }}>原始JSON</h4>
          <textarea
            placeholder="在此粘贴或输入JSON..."
            style={{...validationError.json1 ? errorTextareaStyle : textareaStyle, width: '95%'}}  // 设置100%宽度
            value={json1}
            onChange={handleJsonChange(setJson1, 'json1')}
          />
          <JSONPreview jsonString={json1} />
        </div>

        <div style={{ 
          padding: '16px', 
          backgroundColor: '#fff', 
          borderRadius: '4px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
        //   width: '90%'  // 减小宽度
        }}>
          <h4 style={{ marginBottom: '12px' }}>新JSON</h4>
          <textarea
            placeholder="在此粘贴或输入JSON..."
            style={{...validationError.json2 ? errorTextareaStyle : textareaStyle, width: '95%'}}  // 设置100%宽度
            value={json2}
            onChange={handleJsonChange(setJson2, 'json2')}
          />
          <JSONPreview jsonString={json2} />
        </div>
      </div>

      <button 
        style={{ 
          marginTop: '20px',
          padding: '12px 24px',
          backgroundColor: '#007bff',
          color: '#fff',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
        onClick={handleCompare}
      >
        比较JSON
      </button>
      
      <div style={{ 
        display: 'flex', 
        gap: '16px',
        marginBottom: '20px',
        padding: '12px',
        backgroundColor: darkMode ? '#2d2d2d' : '#f5f5f5',
        borderRadius: '4px'
      }}>
        <button
          onClick={() => setDarkMode(!darkMode)}
          style={{
            padding: '8px 16px',
            background: darkMode ? '#4a5568' : '#e2e8f0',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          {darkMode ? '🌙 深色模式' : '☀️ 浅色模式'}
        </button>
        
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input
            type="checkbox"
            checked={showOrderChanges}
            onChange={(e) => setShowOrderChanges(e.target.checked)}
          />
          显示数组顺序变化
        </label>
      </div>
      
      <div>
        {showOrderChanges && (differences || []).filter(diff => diff.type === 'reorder').map((diff, index) => {
          return (
            <div key={index} className="diff-item" style={{ 
              padding: '12px',
              margin: '8px 0',
              borderRadius: '6px',
              borderLeft: `4px solid ${currentTheme[diff.type]}`,
              backgroundColor: darkMode ? 
                `${currentTheme[diff.type]}20` : 
                `${currentTheme[diff.type]}10`,
              color: currentTheme.text
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{
                  padding: '4px 8px',
                  borderRadius: '4px',
                  backgroundColor: currentTheme[diff.type],
                  color: darkMode ? currentTheme.text : '#ffffff',
                  fontSize: '12px'
                }}>
                  {diff.type === 'added' && '新增'}
                  {diff.type === 'deleted' && '删除'} 
                  {diff.type === 'updated' && '修改'}
                  {diff.type === 'reorder' && '顺序变化'}
                </span>
                <code style={{ 
                  fontSize: '14px',
                  fontWeight: 500,
                  color: currentTheme.text 
                }}>
                  {diff.path}
                </code>
              </div>
              
              {diff.oldValue && (
                <div style={{ marginTop: '8px' }}>
                  <span style={{ opacity: 0.7 }}>原值 → </span>
                  <code style={{ 
                    backgroundColor: darkMode ? '#ffffff10' : '#00000010',
                    padding: '2px 4px',
                    borderRadius: '3px'
                  }}>
                    {JSON.stringify(diff.oldValue)}
                  </code>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ 
        margin: '10px 0',
        padding: '10px',
        backgroundColor: '#f8f9fa',
        borderRadius: '4px'
      }}>
        <strong>差异统计：</strong>
        <span style={{ color: '#28a745', margin: '0 10px' }}>新增 {diffStats.added || 0}</span>
        <span style={{ color: '#dc3545', margin: '0 10px' }}>删除 {diffStats.deleted || 0}</span>
        <span style={{ color: '#ffc107', margin: '0 10px' }}>修改 {diffStats.updated || 0}</span>
        {showOrderChanges && (
          <span style={{ color: '#17a2b8', margin: '0 10px' }}>
            顺序变化 {diffStats.reorder || 0}
          </span>
        )}
      </div>

      {differences.length === 0 && (
        <div style={{ 
          padding: '20px',
          textAlign: 'center',
          color: '#666'
        }}>
          🎉 没有发现差异！
        </div>
      )}
    </div>
  );
}

export default JsonDiffViewer;