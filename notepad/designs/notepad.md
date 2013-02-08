Notepad Overview
================

Advisory
--------
I have been learning JavaScript while writing this code, so expect to find best
practices, conventions or patterns being followed at varying levels of diligence
throughout the code.


Core Concepts
-------------

### URI, Resource, Triple, Triples: rdf.js

A `Resource` is used to represent either a URI or a Literal.

A URI is essentially just a string, that can be displayed in one of several
forms.  In its default format, it is displayed as a CURIE (Compact URI), in the
form `namespace:value` (`ex:foo`,  `rdfs:member` or `dc:created`).  For consumption
in SPARQL queries, a URI can be displayed with angle brackets `<http://example.com/#foo>`.

A Literal is a typed value.  String literals are the only type of literals
handled so far.

The `Resource` class is implemented by using the excellent
[rdfquery](http://code.google.com/p/rdfquery/) package, which offers
signficantly more functionality than is exposed in the `Resource` class.

A `Triple` implements the RDF Triple concept, which is a collection of 3
resources: a subject, a predicate and an object.  The subject and predicate have
to be URIs.  The object can be a URI or a literal. So, a valid triple is either
(URI, URI, URI) or (URI, URI, Literal).

An instance of `Triples` is a collection of triples, forming a directed graph,
implemeting the RDF Dataset concept.

The file `test-rdf.js` is a good starting point to understand these classes.


### FusekiEndpoint: sparql.js

A `FusekiEnpoint` is a standard JavaScript class that provides an interface
with a SPARQL endpoint, as served by [Jena's Fuseki
project](http://jena.apache.org/documentation/serving_data).  Although no
other SPARQL endpoint have been tested, I suspect that this class makes use of
very few Fuseki-specific features and could be easily ported to any SPARQL
endpoints.

A `FusekiEndpoint` is defined by its URI.  Its main function is to execute a
query: it accepts a string containing a SPARQL query, send it to the endpoint
URI and return results, if applicable.  If the query returns a collection of
triples (for example, using the `CONSTRUCT` form), the results will be converted
to a `Triples` instance before being returned to the caller.

The file `endpoint.js` provides a jQuery widget, that manages the display of a
`FusekiEndpoint`. [see endpoint.js]


### Query: query.js

A `Query` is used to represent a SPARQL query that can be executed against a
FusekiEndpoint.

### SPARQL Query Templates: templates/*.sparql

Because JavaScript's multiline string handling is so annoying, I wrote a small
utility (`templates/toJavaScript.py`) to convert SPARQL files into JavaScript
strings, and place them all in a single JavaScript file
(`templates/templates.js`) that can be easily referenced in JavaScript code.

So, after creating a new query or modifying an existing one, you *must* run
./toJavascript.py.  You can then reference that query at
`$.notepad.templates.<filename>`.


### Templates: template.js

A `Template` is a class used to wrap a [Mustache](http://mustache.github.com/)
template so that it can accept an RDF graph as context.


## Notepad jQuery Widgets

All following classes are jQuery widgets.

### endpoint.js

A `notepad.endpoint` widget is a DOM element that defines the FusekiEndpoint
that all DOM elements under it can use to persist themselves and query for RDF.
It also manages an element that displays the URI of the endpoint.

### notepad.js

A `notepad.notepad` widget is a DOM element that manages a notepad on page.  It
manages the `notepad.endpoint`, a URI for the notepad session, and a single
`notepad.container` element, used to manage the content of the session.

### container.js

A `notepad.container` widget is a DOM element that manages a collection of
lines, using a `<ul>` element.  A container contains triples that all relate to
a single URI, the container's URI (`container.getUri()`).  Triples can either
have their subject be the container URI (a "forward triple") or their object, as
long as it is not a literal, (a "backward triple").

A container also implements filters on its content.

### line.js

A `notepad.line` widget is a DOM element that is an element of a
`notepad.container` widget.  Every line contains a single predicate and a single
object.  A line also contains a child container, which contains children lines
of the object, thereby creating a tree structure.

### predicate.js

A `notepad.predicate` widget is a DOM element that manages a predicate and its
label.  It uses a `notepad.urilabel` to display and capture the label used to
display the predicate.


### urilabel.js

A `notepad.urilabel` is a DOM element that manages the display and editing of
the string representation of a URI, ie. its label.  This class is currently only
used to manage the label for a predicate (`notepad.label` is used for the
object).

This widget fetches and displays a label given a URI.  It also uses the
autocomplete widget to allow the user to select a URI, or edit the label of a
URI.

### label.js

A `notepad.label` is a DOM element that manages the display and editing of the
string representation of an object, ie either a URI or a Literal.  This class is
currently only used to manage the object of a line.


### notepad.html

The `notepad.html` file wires it all up together.  It currently contains quite a
bit of code (event handling, etc…) that probably lives somewhere else.


## Additional Concepts

### Filters: container2.js, fact.js, object.js

The `notepad.container2` and `notepad.fact` widgets are used to implement
filters.  Their design is not well formed quite yet.


### Columns: columns.js

Not quite well formed yet.
