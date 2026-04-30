Sprint 1 Report
Word-List-Generator

Shane Ganz, Josiah Norton, Nathaniel Teh

## What's New (User Facing)
* Functional prototype of the front end GUI

## Work Summary (Developer Facing)
This sprint was focused on creating the block system for the frontend of the app. We implemented this using the Reactflow library. Created the canvas, which is the main workspace of the app where blocks are connected. Created the palette where blocks (currently just pend and capitalize) can be dragged onto the canvas. Added a wordlist block which is automatically on the canvas. The block’s connections enforce logical rules. Pend blocks become either append or prepend depending on their placement relative to the wordlist block. Pend blocks, once attached as “or” options, lose their left and right handles. Capitalization blocks can only be connected to the top and bottom handles of the wordlist blocks. Added the ability to load wordlists by clicking on the wordlist block. 

## Unfinished Work
The pend blocks still just have a blank custom field in them rather than having default options. There is also still no leetspeak block, or any way to save and load the canvas state. Also needs to open a system dialogue to choose where to save and what to name the wordlists. Besides that, it mainly needs quality of life features. Better looking GUI theme, bigger handles on the blocks, undo/redo, fullscreen, button in the GUI to delete a block, progress bar. 

## Completed Issues/User Stories
Here are links to the issues that we completed in this sprint:
* https://github.com/WSU-CPTS322-SP26/Word-List-Generator/issues/5
* https://github.com/WSU-CPTS322-SP26/Word-List-Generator/issues/6

## Incomplete Issues/User Stories
Here are links to issues we worked on but did not complete in this sprint:
* https://github.com/WSU-CPTS322-SP26/Word-List-Generator/issues/7
	Lack of time
* https://github.com/WSU-CPTS322-SP26/Word-List-Generator/issues/8
	Lack of time
* https://github.com/WSU-CPTS322-SP26/Word-List-Generator/issues/9
	Low priority QOL feature
* https://github.com/WSU-CPTS322-SP26/Word-List-Generator/issues/10
	Lack of time
* https://github.com/WSU-CPTS322-SP26/Word-List-Generator/issues/11
	Lack of time

## Code Files for Review
Please review the following code files, which were actively developed during this
sprint, for quality:
* Full github repo at the time:
https://github.com/WSU-CPTS322-SP26/Word-List-Generator/tree/1ec58c767f6d74be4438502b2ac63a9be660582f

## Retrospective Summary
Here's what went well:
* Implementation of Reactflow was smooth
* Getting it to read the logic of the blocks
* Enforcing rules through the handles dynamically disappearing and preventing illegal connections

Here's what we'd like to improve:
* Streamline the addition of new features

Here are changes we plan to implement in the next sprint:
* Leetspeak block
* Saving canvas
* System save menu for wordlists before running
* Default pend block options
* General GUI QOL

