# How to Use This Extension

## Cloning the Repository
1.  Run the following command or press the green "code" button to the Download extension:
    ```
    git clone https://github.com/Dilip3936/AIMS_Helper.git
    ```

## How to Load The Extension
1. This extension has only been tested on Google Chrome but would work on all chromium based browsers.
2. **Open the Chrome Extensions Page**
	* Launch your Google Chrome browser.
	* In the address bar, navigate to `chrome://extensions/` and press Enter.
3. **Enable Developer Mode**
	* On the Extensions page, find the **"Developer mode"** toggle switch, usually located in the top-right corner.
	* Turn this toggle **on**. This will reveal additional developer options, including the "Load unpacked" button.
4. **Load Your Extension**
	* Click the **"Load unpacked"** button that has now appeared.
	* Navigate to the directory where you have saved your extension's files (the folder containing `manifest.json`, `popup.js`, etc.).
	* Select the **folder** in which the files are present.
5. After installing the extension it starts autofilling the captcha whenever the website is loaded

## Downloading the timetable
1. Open the course Registration page and click on the extention.
2. Select which courses to add and optionally add the venue and download the .ics file.
### Android 
* Open the .ics file and then select the calender to add the events.
### Web
* Go to calender website.
* Then settings>import&export > select the file and select import.

## Editing/Updating the extension

* **Reloading Changes**: If you modify/Update your extension's code, you must reload it for the changes to take effect. You can do this from the `chrome://extensions/` page.


## Known Bugs
* When selecting the reminder as none, the calenders are choosing the defualt value as 30 mins. Thats not the issue with the extention but of the calender provider. You can manually turn off the reminder for the events in calender app.