InStruct - Notepad
==================

This is the 'notepad' component of inStruct.  inStructs components are:

* notepad (this component)
* jena-fuseki-notepad


Prerequisites
-------------
* Browser: Chrome.  Because it has only been tested with Chrome.


To start developing
-------------------

* Clone the [notepad git repository](https://github.com/mholzen/notepad/) to your local
  machine into a `<directory>`

* Point your browser to `<directory>/notepad/notepad/tests/notepad.html`

* If you have no other components running locally, this notepad should discover the
  inStruct Dev endpoint (http://instruct.vonholzen.org:3030/dev) and allow you to use it.

* You should be able to start making changes

Test
----
* You can execute tests by pointing your browser to `<directory>/notepad/notepad/tests/test-all.html`

* Some of the tests require local components and so may not pass.  Additional work is 
  required to identify and mark test requirements.