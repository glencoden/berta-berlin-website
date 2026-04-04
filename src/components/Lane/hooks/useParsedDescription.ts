import { useEffect, useState } from 'react';
import type { Video } from '../../../types/video';

interface ParsedDescription {
    titleRepeat: string;
    detail: string;
    rest: string[];
}

export const useParsedDescription = (item: Video | null | undefined): ParsedDescription => {
    const [parsedDescription, setParsedDescription] = useState<ParsedDescription>({
        titleRepeat: '', detail: '', rest: [],
    });

    useEffect(() => {
        if (!item) return;
        const split = item.description.split('\n\n');
        const titleStart = item.title.split('-')[0];
        split.splice(split.findIndex(part => part.split('-')[0] === titleStart), 1);
        const detail = split.shift() ?? '';
        setParsedDescription({ titleRepeat: '', detail, rest: split });
    }, [item]);

    return parsedDescription;
};
