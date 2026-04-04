import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { ApplicationProvider } from './context';
import { appVersion } from './variables';

console.log(
    `%c berta.berlin v${appVersion} `,
    'background: #FF8C1A; color: white; font-size: 14px; padding: 4px 8px; border-radius: 4px;'
);

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <ApplicationProvider>
            <App />
        </ApplicationProvider>
    </StrictMode>,
);
