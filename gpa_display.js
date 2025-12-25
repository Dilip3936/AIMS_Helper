(function() {
    let gpaDataCache = null;
    let creditsCache = {};

    function processAndPollForElements(responseText) {
        try {
            gpaDataCache = JSON.parse(responseText);

            const intervalId = setInterval(() => {
                const semesterHeaders = document.querySelectorAll('.hierarchyHdr.changeHdrCls');
                if (semesterHeaders.length > 0) {
                    clearInterval(intervalId);
                    calculateCredits();
                    displayGpaData();
                    displayFinalCGPAAndCredits();
                }
            }, 250);

            setTimeout(() => {
                clearInterval(intervalId);
            }, 10000);

        } catch (e) {
        }
    }

    function calculateCredits() {
        const semesterHeaders = document.querySelectorAll('.hierarchyHdr.changeHdrCls');
        const normalizeText = (str) => String(str || "").toUpperCase().replace(/[^A-Z0-9]/g, '');

        for (const header of semesterHeaders) {
            const headerTextElement = header.querySelector('div.col');
            if (!headerTextElement) continue;

            const pageSemesterText = normalizeText(headerTextElement.textContent);

            let credits = 0;
            let li = header.nextElementSibling;
            while (li && !li.classList.contains('hierarchyHdr')) {
                if (li.classList.contains('dataLi')) {
                    const crEl = li.querySelector('span.col3.col');
                    const electiveType = li.querySelector('span.col5.col');
                    const isAdditional =  electiveType.textContent.includes("Additional");
                    const val = crEl ? parseFloat(crEl.textContent) : NaN;
                    if (!Number.isNaN(val)&& !isAdditional) credits += val;
                }
                li = li.nextElementSibling;
            }

            creditsCache[pageSemesterText] = credits;
        }
    }

    function displayGpaData() {
        if (!gpaDataCache || !Array.isArray(gpaDataCache)) return;

        const semesterHeaders = document.querySelectorAll('.hierarchyHdr.changeHdrCls');
        const normalizeText = (str) => String(str || "").toUpperCase().replace(/[^A-Z0-9]/g, '');

        for (const gpa of gpaDataCache) {
            if (!gpa || !gpa.periodName) continue;

            const gpaSemesterText = normalizeText(gpa.periodName);

            for (const header of semesterHeaders) {
                const headerTextElement = header.querySelector('div.col');
                if (!headerTextElement) continue;

                const pageSemesterText = normalizeText(headerTextElement.textContent);
                if (pageSemesterText !== gpaSemesterText) continue;

                if (!header.querySelector('.gpa-info-span')) {
                    const gpaSpan = document.createElement('span');
                    gpaSpan.className = 'gpa-info-span';
                    gpaSpan.innerHTML = `&nbsp; (SGPA: <b>${gpa.sgpa}</b>, CGPA: <b>${gpa.cgpa}</b>)`;
                    gpaSpan.style.cssText = 'color: #0056b3; font-weight: normal;';
                    headerTextElement.appendChild(gpaSpan);
                }


                if (!header.querySelector('.credits-info-span')) {
                    const credits = creditsCache[pageSemesterText] || 0;
                    const crSpan = document.createElement('span');
                    crSpan.className = 'credits-info-span';
                    crSpan.innerHTML = `&nbsp; <span style="color:#0f766e;">Credits: <b>${credits}</b></span>`;
                    crSpan.style.cssText = 'font-size: 1em;';
                    headerTextElement.appendChild(crSpan);
                }
                break;
            }
        }
    }

    function displayFinalCGPAAndCredits() {
        if (!gpaDataCache || !Array.isArray(gpaDataCache)) return;
        
        let finalCGPA = null;
        for (let i = 0; i < gpaDataCache.length; i++) {
            if (gpaDataCache[i].cgpa !== '-') {
                finalCGPA = gpaDataCache[i].cgpa;
                break;
            }
        }
        if (finalCGPA === null) finalCGPA = 'N/A';

        const normalizeText = (str) => String(str || "").toUpperCase().replace(/[^A-Z0-9]/g, '');

        let totalCredits = 0;
        let completedCredits = 0;

        for (const gpa of gpaDataCache) {
            if (!gpa || !gpa.periodName) continue;
            
            const gpaSemesterText = normalizeText(gpa.periodName);
            const semesterCredits = creditsCache[gpaSemesterText] || 0;
            
            totalCredits += semesterCredits;
            
            if (gpa.sgpa && gpa.sgpa !== '-') {
                completedCredits += semesterCredits;
            }
        }

        const cardBody = document.querySelector('.card-body');
        if (cardBody && !document.querySelector('.final-cgpa-box')) {
            const infoBox = document.createElement('div');
            infoBox.className = 'final-cgpa-box';
            infoBox.innerHTML = `
                <div style="display: flex; align-items: center; gap: 24px;">
                    <div style="text-align: center;">
                        <div style="font-size: 0.75em; font-weight: 600; color: #6366f1; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">CGPA</div>
                        <div style="font-size: 1.75em; font-weight: 700; color: #1e293b;">${finalCGPA}</div>
                    </div>
                    <div style="width: 1px; height: 40px; background: linear-gradient(to bottom, transparent, #e2e8f0, transparent);"></div>
                    <div style="text-align: center;">
                        <div style="font-size: 0.75em; font-weight: 600; color: #f59e0b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Completed Credits</div>
                        <div style="font-size: 1.75em; font-weight: 700; color: #1e293b;">${completedCredits}</div>
                    </div>
                    <div style="width: 1px; height: 40px; background: linear-gradient(to bottom, transparent, #e2e8f0, transparent);"></div>
                    <div style="text-align: center;">
                        <div style="font-size: 0.75em; font-weight: 600; color: #10b981; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Total Credits</div>
                        <div style="font-size: 1.75em; font-weight: 700; color: #1e293b;">${totalCredits}</div>
                    </div>
                </div>
            `;
            infoBox.style.cssText = `
                position: absolute;
                top: 20px;
                right: 20px;
                padding: 16px 24px;
                background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
                border: 2px solid #e2e8f0;
                border-radius: 12px;
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
                transition: all 0.3s ease;
            `;
            infoBox.onmouseenter = function() {
                this.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)';
                this.style.transform = 'translateY(-2px)';
            };
            infoBox.onmouseleave = function() {
                this.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)';
                this.style.transform = 'translateY(0)';
            };
            cardBody.style.position = 'relative';
            cardBody.appendChild(infoBox);
        }
    }

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
