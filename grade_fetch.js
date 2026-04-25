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
