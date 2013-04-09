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

To run using a webserver
------------------------

Running the tests will require that you access your repository using a webserver. Simply move your repository
under the document root of an Apache server, and that should be enough.


Test
----
* You can execute tests by pointing your browser to `<directory>/notepad/notepad/tests/test-all.html`

* Some of the tests require a local triplestore (the jena-fuseki-notepad components running locally)
  and will not pass otherwise.

* You can reset the state of the `test` database by pointing your browser to:

		http://localhost/<path-to-your-repository>/notepad/notepad/tests/reset-dataset.html