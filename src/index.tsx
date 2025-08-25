// src/index.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import reportWebVitals from './reportWebVitals';
import './index.css';
import { Amplify } from 'aws-amplify';

const requiredEnvVars = [
	'REACT_APP_AWS_PROJECT_REGION',
	'REACT_APP_COGNITO_IDENTITY_POOL_ID',
	'REACT_APP_S3_BUCKET',
	'REACT_APP_APPSYNC_GRAPHQLENDPOINT',
	'REACT_APP_APPSYNC_APIKEY',
];
for (const k of requiredEnvVars) {
	if (!process.env[k]) {
		throw new Error(`[Amplify Config Error] "${k}" is not set. Check your .env.development`);
	}
}

Amplify.configure({
	Auth: {
		Cognito: {
			identityPoolId: process.env.REACT_APP_COGNITO_IDENTITY_POOL_ID!,
			allowGuestAccess: true,
		},
	},
	Storage: {
		S3: {
			bucket: process.env.REACT_APP_S3_BUCKET!,
			region: process.env.REACT_APP_AWS_PROJECT_REGION!,
		},
	},
	API: {
		GraphQL: {
			endpoint: process.env.REACT_APP_APPSYNC_GRAPHQLENDPOINT!,
			region: process.env.REACT_APP_AWS_PROJECT_REGION!,
			apiKey: process.env.REACT_APP_APPSYNC_APIKEY!,
			defaultAuthMode: 'apiKey' as const,
		},
	},
});

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(
	<React.StrictMode>
		<App />
	</React.StrictMode>
);

reportWebVitals();
