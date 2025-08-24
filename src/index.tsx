// src/index.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import reportWebVitals from './reportWebVitals';
import './index.css';

import { Amplify } from 'aws-amplify';

// 環境変数からAmplify設定オブジェクトを構築
const amplifyConfig = {
    "aws_project_region": process.env.REACT_APP_AWS_PROJECT_REGION,
    "aws_appsync_graphqlEndpoint": process.env.REACT_APP_APPSYNC_GRAPHQLENDPOINT,
    "aws_appsync_region": process.env.REACT_APP_AWS_PROJECT_REGION,
    "aws_appsync_authenticationType": "API_KEY",
    "aws_appsync_apiKey": process.env.REACT_APP_APPSYNC_APIKEY,
    "Auth": {
        "identityPoolId": process.env.RえEACT_APP_COGNITO_IDENTITY_POOL_ID,
        "region"        : process.env.REACT_APP_AWS_PROJECT_REGION
    },
    "Storage": {
        "AWSS3": {
            "bucket": process.env.REACT_APP_S3_BUCKET, // S3バケット名を環境変数から取得
            "region": process.env.REACT_APP_AWS_PROJECT_REGION // AppSyncと同じリージョン
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