InStruct - Notepad
==================

This is the 'notepad' component of inStruct.  inStructs components are:
* notepad (this component)
* jena-fuseki-notepad


Prerequisites
-------------
* Google Chrome:  because it has only been tested with Chrome.
* Node: to run a simple static webserver.  Read [nodejs.org](http://nodejs.org) to install node.
* Java.  To run the local triplestore.


To start developing
-------------------

Install node.js & npm.

Clone the [notepad git repository](https://github.com/mholzen/notepad/)

Install mongodb and start it.

	$ mongod

Start the webserver

	$ cd notepad
	$ npm install -d
	$ node app

Point your browser to [http://localhost:8080](http://localhost:8080)

Clone the [jena-fuseki-notepad git repository](https://github.com/mholzen/jena-fuseki-notepad/)

	$ cd jena-fuseki-notepad
	$ ./start-triplestore

You should be able to start making changes


Test
----
You can execute tests by pointing your browser to (http://localhost:8080/notepad/tests/test-all.html)

Some of the tests require a local triplestore (the jena-fuseki-notepad components running locally)
and will not pass otherwise.

You can reset the state of the `test` database by pointing your browser to
[reset-dataset.html](http://localhost:8080/notepad/notepad/tests/reset-dataset.html)