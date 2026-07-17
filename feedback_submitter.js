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
        status.innerHTML = 'Refresh the page to check';
    } catch (error) {
        status.innerHTML = `Error: ${error.message}`;
    } finally {
        feedbackBtn.disabled = false;
        feedbackBtn.textContent = 'Submit Feedback';
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
