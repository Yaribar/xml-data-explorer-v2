# XML Data Explorer v2

## Project Overview
This VS Code extension provides a sidebar explorer for XML files, a hierarchical tree view of XML elements, and a data table/webview for editing XML content. It aims to provide a GitLens-like experience for XML, including:
- Sidebar with XML files and elements
- Hierarchical tree view with right-click/context menu
- Webview panel with a flattened, editable table of XML data
- Real VS Code editor for XML file (not just webview)
- Bidirectional sync: table <-> XML file
- Navigation from table to XML element (with highlighting)

## Current State
- Sidebar and tree views work
- Webview panel opens with a table of XML elements and data
- Table shows only elements with direct text content
- Clicking a table row attempts to highlight the corresponding XML in the editor
- Editing the table and clicking Save attempts to update the XML file
- Debug logging is enabled throughout for troubleshooting

## Main Error (XPath Indexing)
- **Symptom:** Clicking on some table rows (e.g., `/library/book/genre`) results in "Element not found for XPath: ..." errors.
- **Root Cause:** The XPath generated for some elements is missing the index (e.g., should be `/library/book[1]/genre`), or the XPath matching logic is not consistent between the table and the XML document.
- **Debugging:** Extensive debug logs are present in the console. Check for:
  - Generated XPaths during flattening
  - XPaths used in the HTML table
  - XPaths passed to navigation
  - XPaths used in the findElementByXPath function
- **Current Status:** The code attempts to generate and match XPaths with indices, but there is still a mismatch for some elements. The main logic for XPath generation and matching is in `src/webview/DataViewPanel.ts`.

## What Works
- Sidebar file and element navigation
- Webview panel with data table
- Table only shows elements with direct text content
- Clicking table row triggers navigation logic
- Debug logging for all major actions

## What Is Missing / Needs Fixing
- **Consistent XPath indexing:** Ensure all elements (especially siblings) get correct indexed XPaths in both the table and the XML document
- **Reliable XPath matching:** The `findElementByXPath` function should always find the correct element, even for indexed siblings
- **Bidirectional sync:** Table edits should always update the XML, and XML edits should refresh the table
- **Highlighting:** Navigation should always highlight the correct element in the XML editor
- **UI polish:** Some UI/UX improvements and error handling
- **Testing:** More robust tests for edge cases (multiple siblings, nested elements, etc.)

## How to Resume Debugging
1. **Open the project in VS Code**
2. **Run the extension in development mode**
   - Use the command: `code --extensionDevelopmentPath=...`
3. **Open the Developer Console** (Help > Toggle Developer Tools)
4. **Check debug logs** for XPath generation and navigation
5. **Edit and test** the logic in `src/webview/DataViewPanel.ts`, especially:
   - `flattenElement`
   - `findElementByXPath`
   - `getElementXPath`
6. **Test with sample.xml** and try clicking on all table rows
7. **Fix any inconsistencies in XPath generation and matching**

## Setup & Testing Instructions
1. `npm install`
2. `npm run compile`
3. Open in VS Code and run the extension in development mode
4. Use the sidebar to open XML files and elements
5. Use the webview panel to edit and navigate XML data
6. Check the Developer Console for debug logs

## Next Steps
- Fix XPath generation and matching for all elements
- Ensure bidirectional sync works for all edits
- Polish UI and error handling
- Add more tests and documentation

---

**You can resume by reviewing the debug logs and focusing on the XPath logic in `DataViewPanel.ts`.** 