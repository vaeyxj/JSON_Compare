import JsonDiffViewer from './components/JsonDiffViewer';
import { HashRouter } from 'react-router-dom';

function App() {
  return (
    <HashRouter>
      <div style={{ padding: '20px' }}>
        <JsonDiffViewer />
      </div>
    </HashRouter>
  );
}

export default App; 