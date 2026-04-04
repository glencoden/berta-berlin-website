import { useEffect, useRef, useState } from 'react';

const IMAGE_LOADING_TIMEOUT = 5;

interface ImageProps {
    url: string;
    width: number;
    height: number;
    title: string;
    className?: string;
}

function Image({ url, width, height, title, className }: ImageProps) {
    const imageRef = useRef<HTMLImageElement>(null);
    const [src, setSrc] = useState('');
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        setLoaded(false);
        setSrc(url);
        const timeoutId = setTimeout(() => setLoaded(true), IMAGE_LOADING_TIMEOUT * 1000);
        return () => clearTimeout(timeoutId);
    }, [url]);

    return (
        <div className={`overflow-hidden bg-neutral-100 ${className ?? ''}`} style={{ width, height }}>
            {src && (
                <img
                    ref={imageRef}
                    src={src}
                    alt={title}
                    onLoad={() => setLoaded(true)}
                    className="object-cover transition-opacity duration-200"
                    style={{ width, height, opacity: loaded ? 1 : 0, transition: loaded ? undefined : 'none' }}
                />
            )}
        </div>
    );
}

export default Image;
