import React  from 'react';
import styles from './AppFooter.module.css';

const AppFooter = () => {
    const currentYear = new Date().getFullYear();

    return (
        <footer className={styles.footerContainer}>
            <div>
                <p className={styles.footerText}>&copy; {currentYear} 峰野研究室 All Rights Reserved.</p>
            </div>
        </footer>
    );
};

export default AppFooter;