import React from 'react'
import ReactDOM from 'react-dom/client'
import PhotoEditor from './PhotoEditor'
import ResultPage from './ResultPage'

function App() {
  const params = new URLSearchParams(window.location.search);
  const view = params.get('view');

  if (view === 'result') {
    return <ResultPage />;
  }

  return <PhotoEditor />;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
