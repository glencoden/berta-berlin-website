import type { ReactNode } from 'react';

interface LoadingMessageProps {
    visible: boolean;
    children: ReactNode;
}

function LoadingMessage({ visible, children }: LoadingMessageProps) {
    return (
        <div
            className="absolute left-0 top-1/2 -translate-y-1/2 w-full px-8 box-border opacity-0"
            style={{ animation: visible ? 'is-loading 0.7s linear infinite alternate' : 'fade-out 1s linear' }}
        >
            <h1 className="text-5xl text-center text-primary-light font-sans">{children}</h1>
        </div>
    );
}

export default LoadingMessage;
