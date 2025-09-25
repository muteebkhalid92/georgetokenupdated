import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';

// Find the element to render our app into
const target = document.body.appendChild(document.createElement('div'));

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  target
);
