// src/index.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import reportWebVitals from './reportWebVitals';
import './index.css';

import { Amplify } from 'aws-amplify';
// aws-exports.jsの直接インポートを削除

// 環境変数からAmplify設定オブジェクトを構築
const amplifyConfig = {
  Auth: {
    Cognito: {
      userPoolId: process.env.REACT_APP_USER_POOLS_ID,
      userPoolClientId: process.env.REACT_APP_USER_POOLS_WEB_CLIENT_ID,
      identityPoolId: process.env.REACT_APP_COGNITO_IDENTITY_POOL_ID,
    }
  },
  API: {
    GraphQL: {
      endpoint: process.env.REACT_APP_APPSYNC_GRAPHQLENDPOINT,
      region: process.env.REACT_APP_AWS_PROJECT_REGION, // AppSyncリージョン
      defaultAuthMode: 'iam' // AppSyncの認証タイプに合わせて変更
    }
  },
  Storage: {
    S3: {
      bucket: process.env.REACT_APP_STORAGE_BUCKET,
      region: process.env.REACT_APP_AWS_PROJECT_REGION, // S3リージョン
    }
  }
};

Amplify.configure(amplifyConfig);

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

reportWebVitals();