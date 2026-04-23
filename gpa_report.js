document.addEventListener("DOMContentLoaded", async () => {
  // --- Persistent Storage Wrapper (STRICTLY Extension Storage) ---
  const storage = {
    get: (keys) => new Promise((resolve) => {
      chrome.storage.local.get(keys, resolve);
    }),
    set: (data) => new Promise((resolve) => {
      chrome.storage.local.set(data, () => resolve());
    })
  };

  // --- State Variables ---
  let { 
    aimsGpaData, aimsStudentData,
    courseOverrides, customCourseTypes, requiredCreditsConfig, customTypeOrder, suggestedCourseTypes 
  } = await storage.get([
    "aimsGpaData", "aimsStudentData",
    "courseOverrides", "customCourseTypes", "requiredCreditsConfig", "customTypeOrder", "suggestedCourseTypes"
  ]);

  courseOverrides = courseOverrides || {};
  customCourseTypes = customCourseTypes || [];
  requiredCreditsConfig = requiredCreditsConfig || {};
  customTypeOrder = customTypeOrder || [];
  suggestedCourseTypes = suggestedCourseTypes || {};
  aimsGpaData = aimsGpaData || [];

  let undoStack = [];
  let allCourses = [];
  let availableTypes = [];
  let degreeData = {};
  let creditSummaryByDegree = {};

  const gradePoints = { "A+": 10, "A": 10, "A-": 9, "B+": 8, "B": 8, "B-": 7, "C+": 6, "C": 6, "C-": 5, "D": 4, "P": 2, "U": 0, "F": 0, "W": 0, "I": 0 };
  const allowedGrades = ["", "A+", "A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D", "P", "U", "F", "W", "I"];

  // --- HTML Parsing (Overwrites Base Data, Keeps Edits) ---
  async function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const doc = new DOMParser().parseFromString(e.target.result, "text/html");

      const newStudentData = {
        name: doc.getElementById("student-name")?.textContent.trim() || aimsStudentData?.name || "",
        rollno: doc.getElementById("rollno")?.textContent.trim() || aimsStudentData?.rollno || "",
        branch: doc.getElementById("branch")?.textContent.trim() || aimsStudentData?.branch || "",
        photo: doc.getElementById("photo")?.src || aimsStudentData?.photo || ""
      };

      let currentSemester = "Unknown";
      let currentDegree = "Unspecified Degree";
      let newAimsGpaData = [];

      doc.querySelectorAll("#courses tr").forEach(row => {
        if (row.children.length === 1 && row.querySelector('td[colspan="5"]')) {
          const spans = row.querySelectorAll('span');
          if (spans.length >= 2) {
            currentSemester = spans[0].textContent.split('—')[0].trim();
            currentDegree = spans[1].textContent.trim();
          }
        } else if (row.children.length >= 5) {
          const type = row.children[2].querySelector('select') ? row.children[2].querySelector('select').value : row.children[2].textContent.trim();
          newAimsGpaData.push({
            courseCd: row.children[0].textContent.trim(),
            courseName: row.children[1].textContent.trim(),
            courseElectiveTypeDesc: type,
            credits: row.children[3].querySelector('input') ? row.children[3].querySelector('input').value : row.children[3].textContent.trim(),
            gradeDesc: row.children[4].querySelector('select') ? row.children[4].querySelector('select').value : row.children[4].textContent.trim(),
            periodName: currentSemester,
            degreeName: currentDegree
          });
        }
      });

      await storage.set({ aimsGpaData: newAimsGpaData, aimsStudentData: newStudentData });
      window.location.reload();
    };
    reader.readAsText(file);
    event.target.value = "";
  }

  // --- Data Processing ---
  async function processData() {
    allCourses = aimsGpaData.map(course => ({ ...course, ...(courseOverrides[`${course.courseCd}_${course.periodName}`] || {}) }));

    let extractedTypes = new Set(customCourseTypes);
    allCourses.forEach(c => { if(c.courseElectiveTypeDesc && c.courseElectiveTypeDesc !== "—") extractedTypes.add(c.courseElectiveTypeDesc.trim()); });
    
    // Sort logic respecting custom order
    let newTypes = Array.from(extractedTypes).filter(t => !customTypeOrder.includes(t)).sort();
    customTypeOrder = customTypeOrder.filter(t => extractedTypes.has(t)); 
    customTypeOrder.push(...newTypes); 
    availableTypes = [...customTypeOrder];
    
    await storage.set({ customTypeOrder }); 

    degreeData = {}; creditSummaryByDegree = {};

    allCourses.forEach((course) => {
      const degree = course.degreeName || "Unspecified Degree";
      const semester = course.periodName || "Unknown";

      if (!degreeData[degree]) {
        degreeData[degree] = { semesters: {}, totalGradePoints: 0, totalGradedCredits: 0, totalAllCredits: 0 };
        creditSummaryByDegree[degree] = {};
      }
      if (!degreeData[degree].semesters[semester]) {
        degreeData[degree].semesters[semester] = { courses: [], gradePoints: 0, gradedCredits: 0, allCredits: 0 };
      }

      const credits = parseFloat(course.credits) || 0;
      const grade = course.gradeDesc ? course.gradeDesc.trim().toUpperCase() : "";
      const points = gradePoints[grade] || 0;
      const type = course.courseElectiveTypeDesc ? course.courseElectiveTypeDesc.trim() : "Unspecified";

      degreeData[degree].semesters[semester].courses.push(course);
      degreeData[degree].semesters[semester].allCredits += credits;
      degreeData[degree].totalAllCredits += credits;

      if ((points > 0 || grade === "D" || grade === "P" || grade === "F" || grade === "U") && type !== "Additional") {
        degreeData[degree].semesters[semester].gradePoints += points * credits;
        degreeData[degree].semesters[semester].gradedCredits += credits;
        degreeData[degree].totalGradePoints += points * credits;
        degreeData[degree].totalGradedCredits += credits;
      }

      creditSummaryByDegree[degree][type] = (creditSummaryByDegree[degree][type] || 0) + credits;
    });

    const photoEl = document.getElementById("photo");
    if(aimsStudentData && aimsGpaData.length > 0) {
      document.getElementById("student-name").textContent = aimsStudentData.name || "Name not found";
      document.getElementById("rollno").textContent = aimsStudentData.rollno || "";
      document.getElementById("branch").textContent = aimsStudentData.branch || "";
      if (aimsStudentData.photo) {
        photoEl.src = aimsStudentData.photo;
        photoEl.style.display = 'block';
      }
    } else {
      document.getElementById("student-name").textContent = "No Data - Please Update Base HTML";
      document.getElementById("rollno").textContent = "";
      document.getElementById("branch").textContent = "";
      photoEl.style.display = 'none';
      photoEl.src = "";
    }
  }

  // --- Push to Undo Stack ---
  function saveHistory() {
    undoStack.push(JSON.parse(JSON.stringify(courseOverrides)));
    if (undoStack.length > 50) undoStack.shift();
  }

  // --- Handlers ---
  async function handleEdit(e) {
    saveHistory();
    const { course, period, field } = e.target.dataset;
    const key = `${course}_${period}`;
    const value = e.target.value.trim();
    
    courseOverrides[key] = courseOverrides[key] || {};
    courseOverrides[key][field] = value;
    await storage.set({ courseOverrides });

    // Dynamic UI Updates (Without losing focus)
    if (field === 'gradeDesc') {
      e.target.className = `editable-input grade-badge ${!value ? 'ungraded' : 'graded'}`;
    }

    if (field === 'courseElectiveTypeDesc') {
      const suggestion = suggestedCourseTypes[course];
      const container = e.target.closest('div');
      let indicator = container.querySelector('.suggestion-indicator');
      
      // Update the star immediately
      if (suggestion && value !== suggestion) {
        if (!indicator) {
          indicator = document.createElement('span');
          indicator.className = 'hide-print suggestion-indicator';
          indicator.title = `Suggested: ${suggestion}`;
          indicator.style.cssText = 'color: #f59e0b; font-weight: bold; margin-left: 6px; cursor: help; font-size: 16px;';
          indicator.textContent = '*';
          container.appendChild(indicator);
        }
      } else {
        if (indicator) indicator.remove();
      }
    }

    await processData(); 
    updateHeaders(); 
    renderSummary();
  }

  async function handleTargetCreditsEdit(e) {
    const type = e.target.dataset.type;
    requiredCreditsConfig[type] = parseFloat(e.target.value) || 0;
    await storage.set({ requiredCreditsConfig });
  }

  document.getElementById("undoBtn").addEventListener("click", async () => {
    if (undoStack.length === 0) { alert("Nothing to undo."); return; }
    courseOverrides = undoStack.pop();
    await storage.set({ courseOverrides });
    await processData(); 
    renderTable(); 
    renderSummary();
  });

  // --- Apply All Suggestions ---
  document.getElementById("applySuggestionsBtn").addEventListener("click", async () => {
    if (Object.keys(suggestedCourseTypes).length === 0) {
      alert("There are no suggested courses in your template.");
      return;
    }

    saveHistory();
    let changesMade = 0;

    allCourses.forEach(course => {
      const suggestion = suggestedCourseTypes[course.courseCd];
      if (suggestion) {
        const key = `${course.courseCd}_${course.periodName}`;
        courseOverrides[key] = courseOverrides[key] || {};
        
        // Only modify if it's currently different from the suggestion
        if (courseOverrides[key].courseElectiveTypeDesc !== suggestion) {
          courseOverrides[key].courseElectiveTypeDesc = suggestion;
          changesMade++;
        }
      }
    });

    if (changesMade > 0) {
      await storage.set({ courseOverrides });
      await processData(); // Force data to process before rendering
      renderTable();
      renderSummary();
    } else {
      alert("All suggestions are already applied.");
    }
  });

  document.getElementById("resetBtn").addEventListener("click", async () => {
    if (!confirm("Are you sure you want to reset all manual edits?")) return;
    saveHistory();
    courseOverrides = {};
    await storage.set({ courseOverrides });
    await processData(); 
    renderTable(); 
    renderSummary();
  });

  document.getElementById("clearAllBtn").addEventListener("click", async () => {
    if (!confirm("⚠️ WARNING: Are you sure you want to delete ALL data? This will permanently remove your imported report, all manual edits, configurations, and reset the page to a blank state. This CANNOT be undone.")) return;
    
    aimsGpaData = []; aimsStudentData = null; courseOverrides = {};
    customCourseTypes = []; requiredCreditsConfig = {}; customTypeOrder = [];
    suggestedCourseTypes = {}; undoStack = [];

    await storage.set({ aimsGpaData, aimsStudentData, courseOverrides, customCourseTypes, requiredCreditsConfig, customTypeOrder, suggestedCourseTypes });
    window.location.reload();
  });

  // --- Batch Config Import/Export ---
  document.getElementById("exportConfigBtn").addEventListener("click", () => {
    const currentSuggestions = {};
    allCourses.forEach(c => {
      const t = c.courseElectiveTypeDesc?.trim();
      if (t && t !== "—" && t !== "Unspecified") currentSuggestions[c.courseCd] = t;
    });

    const config = { 
      customCourseTypes, 
      requiredCreditsConfig, 
      customTypeOrder, 
      suggestedCourseTypes: currentSuggestions 
    };
    const blob = new Blob([JSON.stringify(config, null, 2)], {type: "application/json"});
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "AIMS_Batch_Template.json";
    a.click();
  });

  document.getElementById("importConfigBtn").addEventListener("click", () => document.getElementById("import-config-file").click());
  document.getElementById("import-config-file").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const config = JSON.parse(ev.target.result);
        if(config.customCourseTypes) customCourseTypes = config.customCourseTypes;
        if(config.requiredCreditsConfig) requiredCreditsConfig = config.requiredCreditsConfig;
        if(config.customTypeOrder) customTypeOrder = config.customTypeOrder;
        if(config.suggestedCourseTypes) suggestedCourseTypes = config.suggestedCourseTypes;
        await storage.set({ customCourseTypes, requiredCreditsConfig, customTypeOrder, suggestedCourseTypes });
        window.location.reload();
      } catch(err) { alert("Invalid template file."); }
    };
    reader.readAsText(file);
    e.target.value = "";
  });

  // --- Table Rendering ---
  function renderTable() {
    const tbody = document.getElementById("courses");
    tbody.innerHTML = "";
    if (allCourses.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 30px; color: #6b7280;">No data found. Please upload a report.</td></tr>`;
      return;
    }

    Object.entries(degreeData).forEach(([degree, degreeInfo]) => {
      Object.entries(degreeInfo.semesters).forEach(([semester, data]) => {
        const headerRow = document.createElement("tr");
        headerRow.style.backgroundColor = "#f3f4f6";
        headerRow.innerHTML = `
         <td colspan="5" style="padding: 16px 20px; font-weight: 600;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span id="header_${degree.replace(/\s+/g, '')}_${semester.replace(/[^a-zA-Z0-9]/g, '')}">Loading...</span>
            <span>${degree}</span>
          </div>
        </td>`;
        tbody.appendChild(headerRow);

        data.courses.forEach((course) => {
          const type = course.courseElectiveTypeDesc ? course.courseElectiveTypeDesc.trim() : "Unspecified";
          const grade = course.gradeDesc || "";
          const suggestion = suggestedCourseTypes[course.courseCd];
          const crsKey = `data-course="${course.courseCd}" data-period="${course.periodName}"`;

          // Construct Native Dropdown Optgroups
          let typeOpts = "";
          if (suggestion && availableTypes.includes(suggestion)) {
            typeOpts += `<optgroup label="Suggested">
                           <option value="${suggestion}" ${type === suggestion ? 'selected' : ''}>${suggestion}</option>
                         </optgroup>
                         <optgroup label="Other Types">`;
            availableTypes.forEach(t => {
              if (t !== suggestion) typeOpts += `<option value="${t}" ${type === t ? 'selected' : ''}>${t}</option>`;
            });
            typeOpts += `</optgroup>`;
          } else {
            availableTypes.forEach(t => {
              typeOpts += `<option value="${t}" ${type === t ? 'selected' : ''}>${t}</option>`;
            });
          }

          let indicator = "";
          if (suggestion && type !== suggestion) {
            indicator = `<span class="hide-print suggestion-indicator" title="Suggested: ${suggestion}" style="color: #f59e0b; font-weight: bold; margin-left: 6px; cursor: help; font-size: 16px;">*</span>`;
          }

          const gradeOpts = allowedGrades.map(g => `<option value="${g}" ${g === grade ? "selected" : ""}>${g || "—"}</option>`).join("");

          const row = document.createElement("tr");
          row.innerHTML = `
            <td><strong>${course.courseCd}</strong></td>
            <td>${course.courseName}</td>
            <td>
              <div style="display: flex; align-items: center; width: 100%;">
                <select class="editable-input type-select" style="flex: 1;" ${crsKey} data-field="courseElectiveTypeDesc">${typeOpts}</select>
                ${indicator}
              </div>
            </td>
            <td><input type="number" step="0.5" min="0" class="editable-input" value="${course.credits}" ${crsKey} data-field="credits" style="font-weight: 600;" /></td>
            <td><select class="editable-input grade-badge ${!grade.trim() ? 'ungraded' : 'graded'}" ${crsKey} data-field="gradeDesc">${gradeOpts}</select></td>
          `;
          tbody.appendChild(row);
        });
      });
    });

    document.querySelectorAll("#courses .editable-input").forEach(input => input.addEventListener("change", handleEdit));
    updateHeaders();
  }

  function updateHeaders() {
    Object.entries(degreeData).forEach(([degree, degreeInfo]) => {
      Object.entries(degreeInfo.semesters).forEach(([semester, data]) => {
        const gpa = data.gradedCredits > 0 ? (data.gradePoints / data.gradedCredits).toFixed(2) : "0.00";
        const id = `header_${degree.replace(/\s+/g, '')}_${semester.replace(/[^a-zA-Z0-9]/g, '')}`;
        if(document.getElementById(id)) document.getElementById(id).textContent = `${semester} — GPA: ${gpa} (${data.allCredits.toFixed(1)} credits)`;
      });
    });
  }

  function renderSummary() {
    const summarySection = document.getElementById("summary-section");
    const summaryBody = document.getElementById("summary-body");
    
    if (allCourses.length === 0) { summarySection.style.display = "none"; return; }
    summarySection.style.display = "block";
    summaryBody.innerHTML = "";

    Object.entries(degreeData).forEach(([degree, degreeInfo]) => {
      const cgpa = degreeInfo.totalGradedCredits > 0 ? (degreeInfo.totalGradePoints / degreeInfo.totalGradedCredits).toFixed(2) : "0.00";

      summaryBody.innerHTML += `
        <tr><td colspan="4" style="font-weight: 600; padding: 12px 20px; background-color: #f3f4f6;">${degree}</td></tr>
        <tr><td>CGPA</td><td colspan="3"><strong>${cgpa}</strong></td></tr>
        <tr><td>Total Credits Registered</td><td colspan="3"><strong>${degreeInfo.totalAllCredits.toFixed(1)}</strong></td></tr>
      `;

      if (degreeInfo.totalGradedCredits !== degreeInfo.totalAllCredits) {
        summaryBody.innerHTML += `<tr><td>Graded Credits</td><td colspan="3"><strong>${degreeInfo.totalGradedCredits.toFixed(1)}</strong></td></tr>`;
      }

      summaryBody.innerHTML += `<tr>
        <td style="padding: 8px 20px; font-size: 12px; color: #9ca3af; font-weight: 500;">Credits by Course Type</td>
        <td style="padding: 8px 20px; font-size: 12px; color: #9ca3af; font-weight: 500; text-align: right; width: 80px;">Earned</td>
        <td style="padding: 8px 20px; font-size: 12px; color: #9ca3af; font-weight: 500; text-align: right; width: 80px;">Target</td>
        <td class="hide-print" style="padding: 8px 20px; font-size: 12px; color: #9ca3af; font-weight: 500; text-align: center; width: 50px;"></td>
      </tr>`;
      
      availableTypes.forEach((type) => {
        const total = creditSummaryByDegree[degree][type] || 0;
        const req = requiredCreditsConfig[type] !== undefined ? requiredCreditsConfig[type] : "";
        
        summaryBody.innerHTML += `<tr class="type-row" draggable="true" data-type="${type}">
          <td><span class="drag-handle hide-print">≡</span>${type}</td>
          <td>${total.toFixed(1)}</td>
          <td><input type="number" step="0.5" min="0" class="editable-input target-credit-input" style="width: 60px; font-weight: 600; text-align: right; border: 1px solid #e5e7eb; border-radius: 4px; padding: 2px 4px;" data-type="${type}" value="${req}" placeholder="—" /></td>
          <td class="hide-print"></td>
        </tr>`;
      });
    });

    document.querySelectorAll(".target-credit-input").forEach(input => input.addEventListener("change", handleTargetCreditsEdit));
    attachDragAndDrop();
  }

  // --- Drag and Drop Logic ---
  function attachDragAndDrop() {
    const summaryBody = document.getElementById("summary-body");
    let draggedRow = null;

    summaryBody.querySelectorAll('.type-row').forEach(row => {
      row.addEventListener('dragstart', (e) => {
        draggedRow = row;
        e.dataTransfer.effectAllowed = 'move';
        setTimeout(() => row.classList.add('dragging'), 0);
      });

      row.addEventListener('dragover', (e) => {
        e.preventDefault();
        if (!draggedRow || draggedRow === row) return;
        const bounding = row.getBoundingClientRect();
        const offset = bounding.y + (bounding.height / 2);
        row.classList.remove('drag-over-top', 'drag-over-bottom');
        if (e.clientY - offset > 0) row.classList.add('drag-over-bottom');
        else row.classList.add('drag-over-top');
      });

      row.addEventListener('dragleave', () => row.classList.remove('drag-over-top', 'drag-over-bottom'));

      row.addEventListener('drop', async (e) => {
        e.preventDefault();
        row.classList.remove('drag-over-top', 'drag-over-bottom');
        if (!draggedRow || draggedRow === row) return;

        const bounding = row.getBoundingClientRect();
        const offset = bounding.y + (bounding.height / 2);
        if (e.clientY - offset > 0) row.after(draggedRow);
        else row.before(draggedRow);
        
        draggedRow.classList.remove('dragging');
        draggedRow = null;

        customTypeOrder = Array.from(summaryBody.querySelectorAll('.type-row')).map(r => r.dataset.type);
        availableTypes = [...customTypeOrder];
        await storage.set({ customTypeOrder });
        renderTable(); 
      });

      row.addEventListener('dragend', () => {
        if(draggedRow) draggedRow.classList.remove('dragging');
        summaryBody.querySelectorAll('.type-row').forEach(r => r.classList.remove('drag-over-top', 'drag-over-bottom'));
        draggedRow = null;
      });
    });
  }

  document.getElementById("add-type-btn").addEventListener("click", async () => {
    const input = document.getElementById("new-type-input");
    const newType = input.value.trim();
    if(newType && !availableTypes.includes(newType)) {
      availableTypes.push(newType); customCourseTypes.push(newType); customTypeOrder.push(newType);
      await storage.set({ customCourseTypes, customTypeOrder });
      document.querySelectorAll(".type-select").forEach(select => {
        const val = select.value;
        select.innerHTML = availableTypes.map(t => `<option value="${t}" ${t === val ? "selected" : ""}>${t}</option>`).join("");
      });
      input.value = "";
      renderSummary();
    }
  });

  document.getElementById("uploadBtn").addEventListener("click", () => document.getElementById("upload-html").click());
  document.getElementById("upload-html").addEventListener("change", handleFileUpload);

  // --- PDF Download Handling ---
  document.getElementById("downloadBtn").addEventListener("click", () => {
    const { jsPDF } = window.jspdf;
    const element = document.querySelector(".report");
    const bottomControls = document.getElementById("bottom-controls");
    const controlsBar = document.getElementById("controls-bar");
    const hiddenElements = element.querySelectorAll(".hide-print");

    if(bottomControls) bottomControls.style.display = "none";
    if(controlsBar) controlsBar.style.display = "none";
    hiddenElements.forEach(el => el.style.display = "none");

    const originalStyles = { boxShadow: element.style.boxShadow, borderRadius: element.style.borderRadius, overflow: element.style.overflow };
    element.style.boxShadow = "none"; element.style.borderRadius = "0"; element.style.overflow = "visible";

    const inputs = element.querySelectorAll('select.editable-input, input.editable-input');
    inputs.forEach(input => {
        const span = document.createElement('span');
        span.textContent = input.tagName === 'SELECT' ? (input.options[input.selectedIndex]?.text || "") : (input.value || "—");
        span.className = 'temp-pdf-span';
        
        const style = window.getComputedStyle(input);
        span.style.fontFamily = style.fontFamily; span.style.fontSize = style.fontSize;
        span.style.fontWeight = style.fontWeight; span.style.color = style.color; span.style.textAlign = style.textAlign;
        
        if(input.classList.contains('grade-badge')) {
           span.className = input.className + ' temp-pdf-span';
           span.style.padding = style.padding; span.style.backgroundColor = style.backgroundColor;
        }
        if(input.classList.contains('target-credit-input')) {
           span.style.border = 'none';
        }
        
        input.parentNode.insertBefore(span, input);
        input.style.display = 'none';
    });

    const doc = new jsPDF({ orientation: "p", unit: "pt", format: "a4" });
    doc.html(element, {
      callback: function (doc) {
        element.style.boxShadow = originalStyles.boxShadow; element.style.borderRadius = originalStyles.borderRadius; element.style.overflow = originalStyles.overflow;
        if(bottomControls) bottomControls.style.display = "flex";
        if(controlsBar) controlsBar.style.display = "flex";
        hiddenElements.forEach(el => el.style.display = "");

        document.querySelectorAll('.temp-pdf-span').forEach(span => span.remove());
        inputs.forEach(input => input.style.display = '');

        doc.save(`AIMS_GPA_Report_${aimsStudentData?.rollno || "Export"}.pdf`);
      },
      margin: [40, 20, 40, 20], html2canvas: { scale: 0.6, useCORS: true },
      width: doc.internal.pageSize.getWidth(), windowWidth: element.scrollWidth, x: 0, y: 0
    });
  });

  await processData(); renderTable(); renderSummary();
});