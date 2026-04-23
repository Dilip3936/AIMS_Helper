function injectScript(filePath) {
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL(filePath);
    (document.head || document.documentElement).appendChild(script);
    script.remove();
}

injectScript('gpa_display.js');


function injectEditorButton() {
  // Find a good place to inject the button, like the studentInfoDiv
  const infoDiv = document.querySelector('.studentInfoDiv');
  if (!infoDiv || document.getElementById('open-credits-calculator-btn')) return;

  const btn = document.createElement('button');
  btn.id = 'open-credits-calculator-btn';
  btn.textContent = 'Open credits calculator';
  btn.style.cssText = 'margin-top: 10px; padding: 8px 16px; background: #111827; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 600;';
  
  btn.addEventListener('click', extractAimsDataAndOpenEditor);
  
  infoDiv.appendChild(btn);
}

// Run the injection when the page loads
window.addEventListener('load', injectEditorButton);

async function extractAimsDataAndOpenEditor() {
  // 1. Scrape Student Details
  const studentNameEl = document.querySelector('.stuName');
  const photoEl = document.querySelector('.studentPhoto');
  
  let rollNo = "";
  let branch = "Electrical Engineering";

  // Safely find Roll No and Branch using their labels
  const labels = document.querySelectorAll('.studentInfoDiv label');
  labels.forEach(label => {
    if (label.textContent.includes('Roll No')) {
      rollNo = label.nextElementSibling?.textContent.trim() || "";
    } else if (label.textContent.includes('Branch Name')) {
      branch = label.nextElementSibling?.textContent.trim() || "";
    }
  });

  const studentData = {
    name: studentNameEl ? studentNameEl.textContent.replace(/\s+/g, ' ').trim() : "Unknown",
    rollno: rollNo,
    branch: branch,
    photo: photoEl ? photoEl.src : ""
  };

  const gpaData = [];
  const semesterBlocks = document.querySelectorAll('ul.subCnt');

  // 2. Scrape Course Grades
  semesterBlocks.forEach(block => {
    let currentSemester = "Unknown";
    let currentDegree = "Unspecified Degree";

    const rows = block.querySelectorAll('li.dataLi');

    rows.forEach(row => {
      // Check if it is the Semester/Degree Header Row
      if (row.classList.contains('hierarchyHdr')) {
        const semesterDiv = row.querySelector('div.col');
        if (semesterDiv) {
          // Extracts "JAN26-APR26" by splitting at the first opening parenthesis of the GPA info
          currentSemester = semesterDiv.textContent.split('(')[0].trim();
        }
        
        const degreeSpan = row.querySelector('.hierarchySubHdr span.subHrd');
        if (degreeSpan) {
          currentDegree = degreeSpan.textContent.trim();
        }
      } 
      // Check if it is a valid Course Row (has col1 and col2)
      else if (row.querySelector('.col1') && row.querySelector('.col2')) {
        const courseCd = row.querySelector('.col1').textContent.trim();
        
        if (courseCd && courseCd !== "Course") {
          gpaData.push({
            courseCd: courseCd,
            courseName: row.querySelector('.col2').textContent.trim(),
            courseElectiveTypeDesc: row.querySelector('.col5')?.textContent.trim() || "",
            credits: row.querySelector('.col3')?.textContent.trim() || "0",
            gradeDesc: row.querySelector('.col8')?.textContent.trim() || "",
            periodName: currentSemester,
            degreeName: currentDegree
          });
        }
      }
    });
  });

  // 3. Save to Extension Local Storage
  await new Promise((resolve) => {
    chrome.storage.local.set({
      aimsStudentData: studentData,
      aimsGpaData: gpaData
    }, resolve);
  });

  // 4. Open the Editor Page
  // This requires "tabs" and "gpa_report.html" in web_accessible_resources in manifest.json
  const editorUrl = chrome.runtime.getURL("gpa_report.html");
  window.open(editorUrl, '_blank');
}