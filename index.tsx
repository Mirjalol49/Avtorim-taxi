import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import './src/i18n';
import App from './App';
import ClickSpark from './components/ClickSpark';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <ClickSpark sparkColor="#10b981" sparkSize={12} sparkRadius={20} sparkCount={10} duration={600}>
        <App />
      </ClickSpark>
    </BrowserRouter>
  </React.StrictMode>
);