document.addEventListener('DOMContentLoaded', () => {
    // UI elements
    const fetchBtn = document.getElementById('fetchCoursesBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    const selectAll = document.getElementById('selectAll');
    const loader = document.getElementById('loader');
    const themeToggle = document.getElementById('theme-toggle');

    // --- Dark Mode Logic ---
    const applyTheme = (isDark) => {
    if (isDark) {
        document.body.classList.add('dark-mode');
        themeToggle.checked = true;
    } else {
        document.body.classList.remove('dark-mode');
        themeToggle.checked = false;
    }
};

const savedTheme = localStorage.getItem('theme');
applyTheme(savedTheme !== 'light');

themeToggle.addEventListener('change', () => {
    const isDark = themeToggle.checked;
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    applyTheme(isDark);
});
    // --- End Dark Mode Logic ---

    // Event listener for the "Fetch" button
    fetchBtn.addEventListener('click', async () => {
        fetchBtn.style.display = 'none';
        const gradesBtn = document.getElementById('fetchGradesBtn');
    if (gradesBtn) gradesBtn.style.display = 'none';
        loader.style.display = 'flex';

        let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: scrapeTimetableData,
        }, (injectionResults) => {
            loader.style.display = 'none';
            if (chrome.runtime.lastError || !injectionResults || !injectionResults[0].result) {
                document.getElementById('main-content').innerHTML = '<p style="color:red; text-align:center;">Error: Could not access this page. Is this the AIMS course registration page?</p>';
                return;
            }
            displayCoursesForSelection(injectionResults[0].result);
        });
    });

    // Event listener for the "Download" button
    downloadBtn.addEventListener('click', () => {
        const selectedCourses = [];
        const checkboxes = document.querySelectorAll('.course-checkbox:checked');
        
        if (checkboxes.length === 0) {
            alert('Please select at least one course to download.');
            return;
        }

        const reminder = document.getElementById('reminderTime').value;

        checkboxes.forEach(box => {
            const courseData = JSON.parse(box.dataset.courseData);
            const venue = box.closest('.course-item').querySelector('.venue-input').value;
            selectedCourses.push({ ...courseData, venue: venue });
        });

        const icsString = generateICSContent(selectedCourses, reminder);
        const blob = new Blob([icsString], { type: 'text/calendar;charset=utf-8' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = 'course_schedule.ics';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });
    
    // Event listener for the "Select All" checkbox
    selectAll.addEventListener('change', (event) => {
        document.querySelectorAll('.course-checkbox').forEach(box => {
            box.checked = event.target.checked;
        });
    });
});

async function getStudentId() {
  const { studentId } = await chrome.storage.local.get('studentId');
  return studentId || "1";
}


// --- Fetch Grades via Service Worker ---
const fetchGradesBtn = document.getElementById('fetchGradesBtn');
fetchGradesBtn?.addEventListener('click', async () => {
    
    // Disable button and show fetching state
    fetchGradesBtn.disabled = true;
    const originalText = fetchGradesBtn.textContent;
    fetchGradesBtn.textContent = 'Fetching...';
    
    let studentId = await getStudentId();

    try {
        const resp = await chrome.runtime.sendMessage({ type: "RUN_GRADE_FETCH", studentId });
        const notice = document.createElement('p');
        notice.textContent = 'Please refresh the page to show the grades.';
        notice.style.marginTop = '8px';
        notice.style.color = '#2563eb';
        notice.style.fontWeight = '500';

        fetchGradesBtn.insertAdjacentElement('afterend', notice);
        fetchGradesBtn.style.display = 'none';

        setTimeout(() => notice.remove(), 6000);
    } catch (e) {
        console.error('Failed to trigger grade fetch', e);
        const notice = document.createElement('p');
        notice.textContent = 'Please refresh the page to show the grades.';
        notice.style.marginTop = '8px';
        notice.style.color = '#2563eb';
        notice.style.fontWeight = '500';
        fetchGradesBtn.insertAdjacentElement('afterend', notice);
        fetchGradesBtn.style.display = 'none';
    }
});


document.getElementById('submitFeedbackBtn').addEventListener('click', async () => {
    
    const feedbackBtn = document.getElementById('submitFeedbackBtn');
    const status = document.getElementById('status');
    
    feedbackBtn.disabled = true;
    feedbackBtn.textContent = 'Processing...';
    status.classList.add('show');
    status.innerHTML = 'Scanning for feedback courses...';

    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        if (!tab.url.startsWith('https://aims.iith.ac.in/aims/courseReg/myCrsHistoryPage')) {
            status.innerHTML = 'You are on wrong page';
            return;
        }
        
        await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            function: findAndSubmitFeedback
        });
        status.innerHTML = 'Check console for log!';
    } catch (error) {
        status.innerHTML = `Error: ${error.message}`;
    } finally {
        feedbackBtn.disabled = false;
        feedbackBtn.textContent = 'Find & Submit Feedback';
    }
});


async function findAndSubmitFeedback() {
    console.log('=== IITH Feedback Auto-Submitter ===');
    
    const feedbackLinks = document.querySelectorAll('a[href*="/aims/fmCourseFb/courseFeedback/0/"]');
    
    if (feedbackLinks.length === 0) {
        console.log('No feedback courses found.');
        return;
    }
    
    console.log(`Found ${feedbackLinks.length} courses with feedback enabled.\n`);
    
    for (const link of feedbackLinks) {
        const url = link.href;
        const courseId = url.match(/\/courseFeedback\/0\/(\d+)/)[1];
        
        const row = link.closest('.hierarchyLi.dataLi');
        const courseCode = row?.querySelector('.col1')?.textContent.trim() || 'Unknown';
        const courseName = row?.querySelector('.col2')?.textContent.trim() || 'Unknown';
        
        console.log(`\n ${courseCode} - ${courseName}`);
        
        try {
            const response = await fetch(url, {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Referer': window.location.href
                }
            });
            
            if (!response.ok) {
                console.log(`Failed to fetch (Status: ${response.status})`);
                continue;
            }
            
            const html = await response.text();
            
            const instructorMatch = html.match(/var instructorList\s*=\s*(\[.*?\]);/s);
            const rcIdMatch = html.match(/var rcId\s*=\s*(\d+)/);
            
            if (!instructorMatch || !rcIdMatch) {
                console.log('Could not extract data');
                continue;
            }
            
            const instructorList = JSON.parse(instructorMatch[1]);
            const rcId = rcIdMatch[1];
            
            console.log(`Instructors: ${instructorList.map(i => i.instructorName).join(', ')}`);
            
            const instArr = instructorList.map((instructor, index) => {
                if (index === 0) {
                    return {
                        crsFbLines: [
                            { elementValue: "3.00", questionId: "21", lineNum: "1.", commonQueMan: "1", fbQueRemarks: "" },
                            { elementValue: "3.00", questionId: "22", lineNum: "2.", commonQueMan: "1", fbQueRemarks: "" },
                            { elementValue: "3.00", questionId: "23", lineNum: "3.", commonQueMan: "1", fbQueRemarks: "" },
                            { elementValue: "3.00", questionId: "24", lineNum: "4.", commonQueMan: "1", fbQueRemarks: "" },
                            { elementValue: "3.00", questionId: "25", lineNum: "5.", commonQueMan: "1", fbQueRemarks: "" },
                            { elementValue: "3.00", questionId: "26", lineNum: "6.", commonQueMan: "", fbQueRemarks: "" },
                            { elementValue: "3.00", questionId: "27", lineNum: "7.", commonQueMan: "", fbQueRemarks: "" },
                            { elementValue: "3.00", questionId: "28", lineNum: "8.", commonQueMan: "", fbQueRemarks: "" },
                            { elementValue: "3.00", questionId: "29", lineNum: "9.", commonQueMan: "", fbQueRemarks: "" },
                            { elementValue: "3.00", questionId: "30", lineNum: "10.", commonQueMan: "", fbQueRemarks: "" }
                        ],
                        rcId: parseInt(rcId),
                        runningCourseInstLocId: instructor.runningCourseInstLocId.toString(),
                        remarks: "N/A",
                        commonQueRemarks: "N/A",
                        hasCommonQuestions: "1",
                        prevFlg: 0,
                        prevFlgLines: 0
                    };
                } else {
                    return {
                        crsFbLines: [
                            { elementValue: "3.00", questionId: "26", lineNum: "6.", commonQueMan: "", fbQueRemarks: "" },
                            { elementValue: "3.00", questionId: "27", lineNum: "7.", commonQueMan: "", fbQueRemarks: "" },
                            { elementValue: "3.00", questionId: "28", lineNum: "8.", commonQueMan: "", fbQueRemarks: "" },
                            { elementValue: "3.00", questionId: "29", lineNum: "9.", commonQueMan: "", fbQueRemarks: "" },
                            { elementValue: "3.00", questionId: "30", lineNum: "10.", commonQueMan: "", fbQueRemarks: "" }
                        ],
                        rcId: parseInt(rcId),
                        runningCourseInstLocId: instructor.runningCourseInstLocId.toString(),
                        remarks: "N/A",
                        commonQueRemarks: "N/A",
                        hasCommonQuestions: "0",
                        prevFlg: 0,
                        prevFlgLines: 0
                    };
                }
            });
            
            const payload = { instArr };
            
            const submitResponse = await fetch('https://aims.iith.ac.in/aims/fmCourseFb/courseFeedback', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                    'X-Requested-With': 'XMLHttpRequest',
                    'Accept': '*/*',
                    'Origin': 'https://aims.iith.ac.in',
                    'Referer': `https://aims.iith.ac.in/aims/fmCourseFb/courseFeedback/0/${courseId}`
                },
                body: 'object=' + encodeURIComponent(JSON.stringify(payload))
            });
            
            if (submitResponse.ok) {
                console.log('Feedback submitted successfully!');
            } else {
                console.log(`Submission failed (Status: ${submitResponse.status})`);
            }
            
        } catch (error) {
            console.log(`Error: ${error.message}`);
        }
        
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log('\n=== Complete ===');
}


async function scrapeTimetableData() {
    const allIcons = document.querySelectorAll('span.time_tab_icon');
    if (allIcons.length === 0) return [];

    const createScrapePromise = (icon) => {
        return new Promise((resolve) => {
            const parentRow = icon.closest('.formRowBlock');
            if (!parentRow) { resolve(null); return; }

            const courseCode = parentRow.querySelector('input[id^="cCd_"]')?.title || 'Unknown Code';
            const courseTitle = parentRow.querySelector('input[id^="cDesc_"]')?.title || 'Unknown Title';
            const fullTitle = `${courseCode}: ${courseTitle}`;

            const timetableDivId = icon.id.replace('timeTab_', 'tt_');
            const timetableDiv = document.getElementById(timetableDivId);

            if (!timetableDiv) { resolve({ title: fullTitle, schedule: [] }); return; }

            const observer = new MutationObserver(() => {
                const schedule = [];
                const tableRows = timetableDiv.querySelectorAll('tbody tr');

                if (tableRows.length > 0 && !tableRows[0].textContent.includes("No Time Table Available")) {
                    tableRows.forEach(row => {
                        const cells = row.querySelectorAll('td');
                        if (cells.length >= 3) schedule.push(cells[2].textContent.trim());
                    });
                }
                observer.disconnect();
                resolve({ title: fullTitle, schedule: schedule });
            });

            observer.observe(timetableDiv, { childList: true, subtree: true });
            icon.click();
            icon.click();
        });
    };
    const scrapePromises = Array.from(allIcons).map(icon => createScrapePromise(icon));
    return Promise.all(scrapePromises).then(results => results.filter(Boolean));
}

// Helper functions and `.ics` generation logic
function processSchedule(rawSchedule) {
    if (!rawSchedule || rawSchedule.length === 0) return null;
    const scheduleMap = new Map();
    rawSchedule.forEach(fullTimingString => {
        const parts = fullTimingString.split('----');
        if (parts.length < 2) return;
        const dateStr = parts[0];
        const slotIdentifier = parts[1];
        if (!scheduleMap.has(slotIdentifier)) scheduleMap.set(slotIdentifier, []);
        scheduleMap.get(slotIdentifier).push(new Date(dateStr.split('-').reverse().join('-')));
    });

    const processed = [];
    for (const [slot, dates] of scheduleMap.entries()) {
        if (dates.length > 0) {
            dates.sort((a, b) => a - b);
            processed.push({ slot, startDate: dates[0], endDate: dates[dates.length - 1] });
        }
    }
    return processed;
}

function generateICSContent(selectedCourses, reminder) {
    const dayToICal = { 'Monday': 'MO', 'Tuesday': 'TU', 'Wednesday': 'WE', 'Thursday': 'TH', 'Friday': 'FR', 'Saturday': 'SA', 'Sunday': 'SU' };
    
    let icsContent = `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Your Extension//AIMS Timetable Exporter//EN\r\nBEGIN:VTIMEZONE\r\nTZID:Asia/Kolkata\r\nBEGIN:STANDARD\r\nTZOFFSETFROM:+0530\r\nTZOFFSETTO:+0530\r\nTZNAME:IST\r\nDTSTART:19700101T000000\r\nEND:STANDARD\r\nEND:VTIMEZONE\r\n`;

    selectedCourses.forEach(course => {
        course.schedule.forEach(item => {
            const { slot, startDate, endDate } = item;
            const slotParts = slot.split('-');
            if (slotParts.length < 2) return;

            const dayOfWeek = slotParts[0];
            const timeRange = slotParts.slice(1).join('-');
            const [startTime, endTime] = timeRange.split('-').map(t => t.replace(/:/g, ''));

            const firstEventDate = new Date(startDate);
            while (firstEventDate.toLocaleDateString('en-US', { weekday: 'long' }) !== dayOfWeek) {
                firstEventDate.setDate(firstEventDate.getDate() + 1);
            }
            
            const startYear = firstEventDate.getFullYear();
            const startMonth = (firstEventDate.getMonth() + 1).toString().padStart(2, '0');
            const startDay = firstEventDate.getDate().toString().padStart(2, '0');

            const untilDate = new Date(endDate);
            untilDate.setDate(untilDate.getDate() + 1);
            const untilYear = untilDate.getUTCFullYear();
            const untilMonth = (untilDate.getUTCMonth() + 1).toString().padStart(2, '0');
            const untilDay = untilDate.getUTCDate().toString().padStart(2, '0');

            const uid = `${startYear}${startMonth}${startDay}T${startTime}00-${Math.random().toString(36).substr(2, 9)}@aims.exporter`;
            
            icsContent += `BEGIN:VEVENT\r\nUID:${uid}\r\nDTSTAMP:${new Date().toISOString().replace(/[-:.]/g, '')}Z\r\nSUMMARY:${course.title}\r\n`;
            icsContent += `DTSTART;TZID=Asia/Kolkata:${startYear}${startMonth}${startDay}T${startTime}00\r\n`;
            icsContent += `DTEND;TZID=Asia/Kolkata:${startYear}${startMonth}${startDay}T${endTime}00\r\n`;
            icsContent += `RRULE:FREQ=WEEKLY;UNTIL=${untilYear}${untilMonth}${untilDay}T000000Z;BYDAY=${dayToICal[dayOfWeek]}\r\n`;
            
            if (course.venue) icsContent += `LOCATION:${course.venue}\r\n`;
            
            if (reminder !== 'none') {
                icsContent += `BEGIN:VALARM\r\nACTION:DISPLAY\r\nDESCRIPTION:Reminder\r\nTRIGGER:-PT${reminder}\r\nEND:VALARM\r\n`;
            }
            icsContent += `END:VEVENT\r\n`;
        });
    });

    return icsContent + 'END:VCALENDAR';
}

function displayCoursesForSelection(data) {
    const selectionDiv = document.getElementById('course-selection');
    const controls = document.getElementById('controls');
    const footer = document.getElementById('footer');
    selectionDiv.innerHTML = '';

    let courseCounter = 0;
    data.forEach(course => {
        const processedSchedule = processSchedule(course.schedule);
        if (!processedSchedule) return;

        courseCounter++;
        const courseItem = document.createElement('div');
        courseItem.className = 'course-item';

        const labelGroup = document.createElement('div');
        labelGroup.className = 'course-label-group';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `course_${courseCounter}`;
        checkbox.className = 'course-checkbox';
        checkbox.dataset.courseData = JSON.stringify({ title: course.title, schedule: processedSchedule });

        const label = document.createElement('label');
        label.htmlFor = `course_${courseCounter}`;
        label.textContent = course.title;

        labelGroup.appendChild(checkbox);
        labelGroup.appendChild(label);
        
        const venueInput = document.createElement('input');
        venueInput.type = 'text';
        venueInput.className = 'venue-input';
        venueInput.placeholder = 'Venue...';

        courseItem.appendChild(labelGroup);
        courseItem.appendChild(venueInput);
        selectionDiv.appendChild(courseItem);
    });
    
    if (courseCounter > 0) {
        controls.style.display = 'flex';
        footer.style.display = 'block';
    } else {
        selectionDiv.textContent = 'Make sure you are on the course registration page.';
    }
}