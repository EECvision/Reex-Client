export function isLocalhostUrl(url: string): boolean {
    if (!url) return false;
    let urlToParse = url;
    if (!urlToParse.startsWith('http://') && !urlToParse.startsWith('https://')) {
        urlToParse = 'http://' + urlToParse;
    }
    try {
        const parsed = new URL(urlToParse);
        return parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
    } catch {
        return url.includes('localhost') || url.includes('127.0.0.1');
    }
}
