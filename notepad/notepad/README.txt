URI: address to retrieve content
CONTENT:
TRIPLE: (uri, uri, content)  or (uri,uri,uri)

PREDICATE: a URI used as the second item of a triple, (or a predicate from a semantic statement)


ENDPOINT
========
An endpoint retrieves and stores triples.
An endpoint can be:
    - a SPARQL endpoint
    - a memory triplestore
    - a multiplexing endpoint, that queries a list of endpoints and joins results

A query searches an endpoint.

OBJECT
======
An object is a DOM element that participates in a triple as the object, i.e. either as a literal or as a URI/label combination.

It maintains the relationship between the URI and a representation of it.
It is configurable with a query that defines that relationship.
It defaults to ?about rdfs:label ?label.

It is configurable with a template that defines how to represent the resulting graph
It defaults to <div>{{{rdfs:label}}}</div>

Its subject and predicate can be set to ?reason

CONTAINER
=========
A container is a DOM element that provides editing (display and save) a collection of triples relating to a given URI.
A container
    - has a query (defaults to Describe)
        - to: discover triples
    - requires a URI (searches up for attribute about)
        - to: know what triples to retrieve and save
        - provides the URI
    - requires an endpoint (searches up the DOM for #notepad-endpoint) or #notepad-notepad
        - to: know where to run the query
    - has a element widget (defaults to notepad-line)
        - to: delegate displaying and editing members of the collection
    - executes the query using (at minimum) the URI as a parameter

    POSSIBLE FUTURE CHANGES:
    - right now, this is essentially a "named container".  When we remove the need to have a URI; make a container simply about displaying a list of triples returned by a query

LINE
====
A line is a DOM element that provides editing a single triple, related to a container, where the container's uri is either the subject or the object.
    - requires a container
    - has one triple (currently getContainerTriple())
    - has a method to display itself
        - has a method to display the predicate
        - has a method to display the object of the triple (either a URI or a literal)
            - has a method to provide a new method for displaying the object
    - triples(): provides a list of all triples expressed by this element, including labels

    POSSIBLE FUTURE CHANGES:
    - generalize to "a triple in a container", which would require reification (to associate any triple with the container URI)

A container, with lines as its element, is "one node a in graph, all its connected nodes and their edges"



A URI is a DOM element that represents a URI
    - has a method to display itself
        - has a method to change the template used to display the graph, from <div>{{{rdfs:label}}}</div>  to  <div> <... html ...> {{{nmo:summary}}} {{{ any predicate }}}</div>
