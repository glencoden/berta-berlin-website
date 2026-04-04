import { useParsedDescription } from '../../hooks/useParsedDescription';
import { useApplicationContext } from '../../../../context';
import { controlsMargin, controlsOverlayWidth } from '../../../../variables';
import type { Video } from '../../../../types/video';

function parseLinks(str: string): string {
    const urlRegex = /(https?:\/\/.[^\s]+)/g;
    const urls = str.match(urlRegex) || [];
    let result = str;
    urls.forEach(url => {
        result = result.replace(url, `<a href='${url}' rel='noopener noreferrer' target='_blank' class='text-secondary no-underline'>${url}</a>`);
    });
    return result;
}

interface VideoDetailProps {
    activeItem: Video | null;
    visible: boolean;
}

function VideoDetail({ activeItem, visible }: VideoDetailProps) {
    const { state } = useApplicationContext();
    const parsedDescription = useParsedDescription(activeItem);

    return (
        <div
            className="scrollbar-hidden absolute right-0 top-0 whitespace-pre-line box-border text-primary bg-white overflow-scroll transition-all duration-300"
            style={{
                width: state.tileSize.width * (100 - controlsOverlayWidth) / 100,
                height: state.tileSize.height,
                padding: `${controlsMargin}rem`,
                opacity: visible ? 1 : 0,
                transform: `translateY(${state.videoStarted ? '100%' : '0'})`,
            }}
        >
            {parsedDescription.rest.map((part, index) => (
                <p key={index} className="font-sans" style={{ paddingBottom: `${controlsMargin}rem` }}
                    dangerouslySetInnerHTML={{ __html: parseLinks(part) }} />
            ))}
        </div>
    );
}

export default VideoDetail;
