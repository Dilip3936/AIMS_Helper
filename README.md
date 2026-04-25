# AIMS Helper

## Features

* **View Grades without feedback**: Shows your grades of courses without feedback directly on the page.
* **Submits feedback with single click**: Submits feedback for all courses with a single click.
* **Automatic CAPTCHA Solver**: Automatically fills in the CAPTCHA on the AIMS login page.
* **Timetable Exporter**: Allows you to select your registered courses and download them as an `.ics` file, which can be imported into Google Calendar, Apple Calendar, and other calendar applications.
* **GPA Viewer**: Clearly displays your SGPA and CGPA (from database) for each semester directly on your course history page.
* **Credits Calculator**: An interactive tool to simulate your GPA, set target credits, share Curriculum, and export formatted PDF reports.
---

## Installation

### 1. Get the Code

Run the following command or press the green "Code" button on the GitHub page to download the extension files.

```
git clone https://github.com/Dilip3936/AIMS_Helper.git
```

### 2. Load the Extension

This extension works on Google Chrome and other Chromium-based browsers (Edge, Brave, etc.).

1.  **Open the Chrome Extensions Page**
    * Launch your Google Chrome browser.
    * In the address bar, navigate to `chrome://extensions/` and press Enter.
2.  **Enable Developer Mode**
    * On the Extensions page, find the **"Developer mode"** toggle switch, usually located in the top-right corner.
    * Turn this toggle **on**. This will reveal additional options, including the "Load unpacked" button.
3.  **Load Your Extension**
    * Click the **"Load unpacked"** button.
    * Navigate to the directory where you saved the extension's files (the folder containing `manifest.json`).
    * Select the folder to install the extension.

---


## Usage Guide

* All these buttons are available after clicking on the extension from the extensions list.

### **Viewing grades of courses without feedback:**

* click the fetch all grades button and refresh the page.

### **Submitting feedback**

* Go to the course history page and click on submit feedback.

### Autofilling CAPTCHA

After installing the extension, it will automatically start filling the CAPTCHA whenever the AIMS login page is loaded.

### Downloading Your Timetable

1.  Open the AIMS course registration page and click on the extension's icon in your browser's toolbar.
2.  Select the courses you wish to export, optionally add the venue for each course, and download the `.ics` file.

#### **Importing to Your Calendar:**

* **Android**: Open the `.ics` file and select your calendar app to add the events.
* **Web (Google Calendar, etc.)**: Go to your calendar's website, find **Settings > Import & Export**, and select the downloaded `.ics` file to import.

### Credits Calculator 

The extension includes a built-in GPA planner and report formatter. All data is processed locally.

- **Opening the Editor**: Navigate to your AIMS course history page. The extension will automatically read your academic data. Click the "Open Credits Calculator" button on the page to launch the tool.
    
- **Planning & Editing**:
    
    - Change grades, credits, or course types to simulate your CGPA.
        
    - Set target credits for different course categories in the summary section.
        
    - Click the remove button to delete categories that have zero credits.
        
    - Drag and drop summary rows to rearrange their display order.
        
- **Using Templates**:
    
    - **Export**: Save your custom course types, sorting order, target credits, and course suggestions as a `.json` template to share with others.
        
    - **Import**: Load a `.json` template to apply a Curriculum.
        
    - **Apply Suggestions**: Click this button to automatically update your courses to match the suggested types defined in the Curriculum.
        
- **Controls**:
    
    - **Undo**: Reverts your last edit.
        
    - **Reset Edits**: Clears your manual changes while keeping your base AIMS data intact.
        
    - **Clear**: Completely wipes the saved data and resets the tool to a blank state.
        
    - **Download PDF**: Exports your customized report as a clean, print-ready document.
        

---
## Code Organization

Each feature now has a dedicated file for easier navigation:

* `timetable.js` - popup timetable scraping, selection UI, and `.ics` export.
* `grade_fetch.js` - popup trigger for background grade fetching.
* `feedback_submitter.js` - popup trigger and submission flow for feedback.
* `login_captcha_autofill.js` - CAPTCHA autofill on login pages.
* `grade_fill.js` - fills missing grades on course history pages.
* `gpa_inject.js` - injects GPA display script into course history pages.
* `gpa_display.js` - SGPA/CGPA/credits rendering on the course history page.
* `credits_calculator_launcher.js` - adds the "Open credits calculator" button and launches report page.
* `grade_fetch_sw.js` - service worker logic for grade catalog/history fetch.
* `credits_calculator.html` - credits calculator page shell.
* `credits_calculator.js` - credits calculator/report editor behavior.

---

## Editing/Updating the Extension

If you modify or update the extension's code, you must reload it for the changes to take effect. You can do this from the `chrome://extensions/` page by clicking the reload icon on the extension's card.

---

## Note:

* **This extension is not related to Lambda (IITH) nor the admin department of IITH.**

---

## Known Bugs

* When selecting "None" for a reminder, some calendar applications may still set a default reminder (e.g., 30 minutes). This is not an issue with the extension but is the default behavior of the calendar provider. You can manually turn off the reminder for the events in your calendar app. The google calender allows you set defualt notification time to none which should solve the issue.