import React  from 'react';
import styles from './AppHeader.module.css';

const AppHeader = () => {
    return (
        <header className={styles.headerContainer}>
            <div>
                <h1 className={styles.title}>メロン画像分析アプリ</h1>
            </div>
        </header>
    );
};

export default AppHeader;