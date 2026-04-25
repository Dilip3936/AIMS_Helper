function injectScript(filePath) {
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL(filePath);
    (document.head || document.documentElement).appendChild(script);
    script.remove();
}

injectScript('gpa_display.js');
