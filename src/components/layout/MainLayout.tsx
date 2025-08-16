import React      from 'react';
import { Outlet } from 'react-router-dom';
import AppHeader  from './AppHeader';
import AppFooter  from './AppFooter';

const MainLayout = () => {
    return (
        <>
        <AppHeader />
        <div className="app-container">
            <main className="main-content">
            <Outlet />
            </main>
        </div>
        <AppFooter />
        </>
    );
};

export default MainLayout;