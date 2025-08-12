(function() {
    let gpaDataCache = null;

    function processAndPollForElements(responseText) {
        try {
            gpaDataCache = JSON.parse(responseText);

            const intervalId = setInterval(() => {
                const semesterHeaders = document.querySelectorAll('.hierarchyHdr.changeHdrCls');
                if (semesterHeaders.length > 0) {
                    clearInterval(intervalId);
                    displayGpaData();
                }
            }, 250);

            // Safeguard to stop polling after 10 seconds.
            setTimeout(() => {
                clearInterval(intervalId);
            }, 10000);

        } catch (e) {
            // Fail silently in production.
        }
    }

    function displayGpaData() {
        if (!gpaDataCache || !Array.isArray(gpaDataCache)) return;

        const semesterHeaders = document.querySelectorAll('.hierarchyHdr.changeHdrCls');
        const normalizeText = (str) => str.toUpperCase().replace(/[^A-Z0-9]/g, '');

        for (const gpa of gpaDataCache) {
            if (!gpa || !gpa.periodName) continue;

            const gpaSemesterText = normalizeText(gpa.periodName);

            for (const header of semesterHeaders) {
                const headerTextElement = header.querySelector('div.col');
                
                if (headerTextElement) {
                    const pageSemesterText = normalizeText(headerTextElement.textContent);

                    if (pageSemesterText === gpaSemesterText) {
                        if (!header.querySelector('.gpa-info-span')) {
                            const gpaSpan = document.createElement('span');
                            gpaSpan.className = 'gpa-info-span';
                            gpaSpan.innerHTML = `&nbsp; (SGPA: <b>${gpa.sgpa}</b>, CGPA: <b>${gpa.cgpa}</b>)`;
                            gpaSpan.style.cssText = 'color: #0056b3; font-weight: normal;';
                            headerTextElement.appendChild(gpaSpan);
                        }
                        break; 
                    }
                }
            }
        }
    }

    // --- Interceptor for XMLHttpRequest (XHR) ---
    const originalXhrOpen = XMLHttpRequest.prototype.open;
    const originalXhrSend = XMLHttpRequest.prototype.send;

    XMLHttpRequest.prototype.open = function(...args) {
        this._url = args[1];
        return originalXhrOpen.apply(this, args);
    };

    XMLHttpRequest.prototype.send = function(...args) {
        this.addEventListener('load', function() {
            if (this.status === 200 && this._url && this._url.includes('/courseReg/getPeriodWiseCGPASGPA/')) {
                processAndPollForElements(this.responseText);
            }
        });
        return originalXhrSend.apply(this, args);
    };
})();
