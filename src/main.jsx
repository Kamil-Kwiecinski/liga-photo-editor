import React from 'react'
import ReactDOM from 'react-dom/client'
import PhotoEditor from './PhotoEditor'
import ResultPage from './ResultPage'
import MvpEditor from './MvpEditor'
import LineupEditor from './LineupEditor'

function App() {
  const params = new URLSearchParams(window.location.search);
  const view = params.get('view');
  const mode = params.get('mode');

  if (view === 'result') {
    return <ResultPage />;
  }

  // Dedykowany edytor MVP grafiki (osobny flow od wyniku meczu)
  if (mode === 'mvp') {
    return <MvpEditor />;
  }

  // Starting Lineup (wyjściowa szóstka / lineup siatkówka + przyszłe sporty)
  if (mode === 'lineup') {
    return <LineupEditor />;
  }

  return <PhotoEditor />;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
