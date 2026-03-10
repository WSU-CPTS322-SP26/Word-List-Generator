Sprint 1 Report
Word-List-Generator


Shane Ganz, Josiah Norton, Nathaniel Teh


## What's New (User Facing)
* Functional prototype of the backend instruction-based generator
* WIP frontend/backend communication 
* WIP frontend GUI using Wails


## Work Summary (Developer Facing)
This sprint was focused on establishing a well-designed backbone for our program’s core functionality of wordlist mutation. We did thorough research on how to maximize performance through concurrent processes, buffered I/O, and memory reuse. This careful design resulted in a robust prototype that can take a wide variety of instructions and is fast enough to generate millions of mutations per second. We expect that this portion of our application will need no significant changes, save for the introduction of additional features as the project goes on. Our application now has a working core that we can build features around. 


## Unfinished Work
The frontend/backend communication and the frontend GUI are still in early WIP stages. We have also not implemented a way for the generator to report its progress to the user while running. The GUI and translation had significant work done on them, but we ran out of time to complete functional prototypes of either. The progress tracker is a non-essential feature, so is given a lower priority as our current goal is creating functional prototypes of all main application components (frontend GUI, instructional interpreter, backend generator). 


## Completed Issues/User Stories
Here are links to the issues that we completed in this sprint:
* https://github.com/WSU-CPTS322-SP26/Word-List-Generator/issues/4


## Incomplete Issues/User Stories
Here are links to issues we worked on but did not complete in this sprint:
* https://github.com/WSU-CPTS322-SP26/Word-List-Generator/issues/1
        Low priority, requires functional GUI prototype


## Code Files for Review
Please review the following code files, which were actively developed during this
sprint, for quality:
* /src/ (https://github.com/WSU-CPTS322-SP26/Word-List-Generator/tree/main/src)


## Retrospective Summary
Here's what went well:
* Research and design
* Implementation of the generator


Here's what we'd like to improve:
* Communication between team members
* Division of work


Here are changes we plan to implement in the next sprint:
* Functional GUI prototype
* Functional frontend/backend communication prototype
* Combination of all three components into an overall functional app prototype
