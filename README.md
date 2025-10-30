# AIMS Helper

## Features

* **Automatic CAPTCHA Solver**: Automatically fills in the CAPTCHA on the AIMS login page.
* **Timetable Exporter**: Allows you to select your registered courses and download them as an `.ics` file, which can be imported into Google Calendar, Apple Calendar, and other calendar applications.
* **GPA Viewer**: Clearly displays your SGPA and CGPA for each semester directly on your course history page.
* **View Grades without feedback**: Shows your grades of courses without feedback directly on the page.
---

## Installation

### 1. Get the Code

Run the following command or press the green "Code" button on the GitHub page to download the extension files.

```
    git clone https://github.com/Dilip3936/AIMS_Helper.git
```


### 2. Load The Extension

This extension has been tested on Google Chrome but should work on all Chromium-based browsers (like Microsoft Edge, Brave, etc.).

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

## Usage

### Autofilling CAPTCHA

After installing the extension, it will automatically start filling the CAPTCHA whenever the AIMS login page is loaded.

### Downloading Your Timetable

1.  Open the AIMS course registration page and click on the extension's icon in your browser's toolbar.
2.  Select the courses you wish to export, optionally add the venue for each course, and download the `.ics` file.

#### **Importing to Your Calendar:**

* **Android**: Open the `.ics` file and select your calendar app to add the events.
* **Web (Google Calendar, etc.)**: Go to your calendar's website, find **Settings > Import & Export**, and select the downloaded `.ics` file to import.

### **Viewing grades of courses without feedback:**

* click the fetch all grades button and refresh the page.

---

## Editing/Updating the Extension

If you modify or update the extension's code, you must reload it for the changes to take effect. You can do this from the `chrome://extensions/` page by clicking the reload icon on the extension's card.

---

## Known Bugs

* When selecting "None" for a reminder, some calendar applications may still set a default reminder (e.g., 30 minutes). This is not an issue with the extension but is the default behavior of the calendar provider. You can manually turn off the reminder for the events in your calendar app.