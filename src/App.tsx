// src/App.tsx
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import SensorDataPage from "./pages/SensorDataPage"; // 作成したページをインポート
import MainLayout from "./components/layout/MainLayout"; // レイアウトコンポーネント
import "./styles/global.css";

// MainLayout, AppHeader, AppFooterのコンポーネントはmelon-appからコピーして利用してください

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<MainLayout />}>
          <Route path="/sensors" element={<SensorDataPage />} />
          {/* 初期表示ページをセンサーページにリダイレクト */}
          <Route path="/" element={<Navigate to="/sensors" />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default App;