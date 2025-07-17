# How to Use This Extension

## Cloning the Repository
1.  Run the following command to the Download extension:
    ```
    git clone https://github.com/Dilip3936/aims-iith-captcha.git
    ```

## How to Load The Extension
1. This extension has only been tested on Google Chrome.
2. **Open the Chrome Extensions Page**
	* Launch your Google Chrome browser.
	* In the address bar, navigate to `chrome://extensions/` and press Enter.
3. **Enable Developer Mode**
	* On the Extensions page, find the **"Developer mode"** toggle switch, usually located in the top-right corner.
	* Turn this toggle **on**. This will reveal additional developer options, including the "Load unpacked" button.
4. **Load Your Extension**
	* Click the **"Load unpacked"** button that has now appeared.
	* Navigate to the directory where you have saved your extension's files (the folder containing `manifest.json`, `contentScript.js`, etc.).
	* Select the folder in which the files are present.
5. After installing the extension it starts autofillig the captcha whenever the website is loaded

## Editing the extension

* **Reloading Changes**: If you modify your extension's code, you must reload it for the changes to take effect. You can do this from the `chrome://extensions/` page.