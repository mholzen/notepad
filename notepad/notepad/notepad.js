/*

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

*/

(function($, undefined) {

    var DEFAULT_ENDPOINT = new Triples(
        new Triple('rdf:Property', 'rdfs:label', 'property'),
        new Triple('rdfs:member', 'rdfs:label', 'member')
    );

    $.widget("notepad.notepad", {
        options: {
            endpoint: DEFAULT_ENDPOINT
        },
        _setOption: function(key, value) {
            switch(key) {
                case 'endpoint':
                this.element.endpoint({endpoint: value});
                break;
            }
            this._super(key, value);        // We have jquery-ui 1.9
        },

        getUri: function() {
            return this.element.attr('about');
        },
        _setUri: function(uri) {
            this.element.attr('about',uri);
        },
        setUri: function(uri) {
            this._setUri(uri);
            
            // Setting the URI should update the line representation and any children
            var container = this.getContainer();
            this.getRdf(uri, function(triples) {
                container._updateFromRdf(triples);
            });
        },

        getContainer: function() {
            return this.element.children('ul').data('container');
        },
        getLines: function() {
            return this.getContainer().getLines();
        },

        // Set up the notepad
        _create : function() {
            var self = this;

            this.element.addClass("notepad");
            this.option('endpoint', this.options.endpoint);

            this._setUri($.notepad.getNewUri());

            var ul = $('<ul>').appendTo(this.element).container();  // Create an empty container
            this.getContainer().appendLine();  // Start with one empty line
            
            this.element.on("keydown.notepad", function(event) {
                if($(event.target).data('autocomplete') && $(event.target).data('autocomplete').menu.active) {
                    // The autocomplete menu is active, do nothing here
                    return;
                }

                var keyCode = $.ui.keyCode;
                switch (event.keyCode) {
                case keyCode.ENTER:
                case keyCode.NUMPAD_ENTER:
                    return self._return(event);
                    break;
                case keyCode.UP:
                    return self._up(event);
                    break;
                case keyCode.DOWN:
                    return self._down(event);
                    break;
                case keyCode.TAB:
                    if (!event.shiftKey) {
                        self._indent(event);
                    } else {
                        self._unindent(event);
                    }
                    return false;
                    break;
                default:
                    break;
                }
            });
        },
        _destroy : function() {
            this.element.removeClass("notepad").removeAttr('about').unbind();
            this.element.children().remove();
        },
        _up : function(event) {
            var target = $(event.target);
            var li = target.parent('li');
            // Get the list of lines
            var lines = li.data('line').getNotepad().getContainer().getAllLineElements();
            var i;
            for (i=0; i<lines.length; i++) {
                if (lines[i] == li[0]) {
                    break;
                }
            }
            if (i>0) {
                $(lines[i-1]).data('line').focus();
            }
            return false;   // Prevent default behaviour
        },
        _down : function(event) {
            var target = $(event.target);
            var li = target.parent('li');

            // Get the list of lines
            var lines = li.data('line').getNotepad().getContainer().getAllLineElements()
            var i;
            for (i=0; i<lines.length; i++) {
                if (lines[i] == li[0]) {
                    break;
                }
            }
            if (i<lines.length-1) {
                $(lines[i+1]).data('line').focus();
            }
            return false;   // Prevent default behaviour
        },
        _return : function(event) {
            var target = $(event.target);
            var li = target.parent('li');
            var ul = li.parent('ul');
            
            var newLine;
            if (target.caret() == 0) {
                newLine = li.data('line').insertLineBefore();
                li.focus();         // Focus on the line that moved down
            } else {
                newLine = li.data('line').insertLineAfter();
                newLine.focus();
            }
            
            return false;
        },
        _indent : function(event) {
            var li = $(event.target).parent('li');

            // when on the predicate, then skip to the object
            if ($(event.target).hasClass('notepad-predicate')) {
                li.find('.notepad-object:first').focus();
                return false;
            }

            var result = li.data('line').indent();

            li.data('line').focus();
            return result;
        },
        _unindent : function(event) {
            var li = $(event.target).parent('li');

            if ($(event.target).hasClass('notepad-object') &&
                li.find('.notepad-predicate').css('display') != 'none') {
                li.find('.notepad-predicate').focus();
                return false;
            }
            
            var result = li.data('line').unindent();
            li.data('line').focus();
            return result;
        },

        // TODO: this really should be expressed in RDF
        defaultPredicates: [
            {
                uri: 'rdf:Property',
                labels: ['property']
            },
            {
                uri: 'rdfs:member',
                labels: ['member']
            }
        ],
        defaultPredicateLabelsByUri: {
            'rdf:Property': ['property'],
            'rdfs:member':  ['member']
        },

        getEndpoint: function() {
            return this.element.data('endpoint').getEndpoint();
        },
        getRdf: function(uri, callback) {
            return this.endpoint.getRdf(uri,callback);
        },
        getRdfBySubject: function(uri, callback) {
            this.endpoint.getRdfBySubject(uri, callback);
        },
        getRdfBySubjectObject: function(uri, callback) {
            this.endpoint.getRdfBySubjectObject(uri, callback);
        },
        getSubjectsLabelsByLabel: function(label, callback) {
            return this.endpoint.getSubjectsLabelsByLabel(label, callback);
        },   

        _getNotepadPredicateLabels: function(uri) {
            var labels = _.clone(this.defaultPredicateLabelsByUri[uri] || []);

            var elementsWithPredicate = this.element.find('[rel="'+uri+'"]');
            _.each(elementsWithPredicate, function(element) {
                var label = $(element).val();
                if ( label.length > 0) {
                    labels.push( label );
                }
            });
            return _.uniq(labels);
        },
        getLabels: function(uri, callback) {
            // get labels from notepad-triples-endpoint
            // get labels from notepad-endpoint
            // merge
            var notepadPredicateLabels = this._getNotepadPredicateLabels(uri);
            if (this.endpoint === undefined) {
                return callback(notepadPredicateLabels);
            }
            this.endpoint.getLabels(uri, callback, notepadPredicateLabels);
            return notepadPredicateLabels;
        },

        _getNotepadPredicatesLabelsByLabel: function(wantedLabel) {
            var results = [];
            _.each( this.defaultPredicates, function(predicate) {
                _.each( predicate.labels, function(label) {
                    if (label == wantedLabel) {
                        results.push ( {label: label, value: predicate.uri} );
                    }
                });
            });
            return results;
        }, 
        getPredicatesLabelsByLabel: function(label, callback) {
            var notepadPredicateLabels = this._getNotepadPredicatesLabelsByLabel(label);
            if (this.endpoint === undefined) {
                return callback(notepadPredicateLabels);
            }
            this.endpoint.getPredicatesLabelsByLabel(label, callback, notepadPredicateLabels);
        },
        setRdf: function(triples) {
            this.getContainer()._updateFromRdf(triples);
        },
        
        triples: function(){
            var triples = new Triples(0);
            triples.push(new Triple(this.getUri(), "rdf:type", "notepad:Session")); // ALT: use RDFAs typeof attribute instead
            $.merge(triples,this.getContainer().triples());
            return triples;
        },
        deletedTriples: function() {
            return $.grep(this.triples(), function(triple) { return triple.operation === 'delete'; });
        },
        contains: function(triple) {
            return this.triples().contains(triple);
        },
        expresses: function(triple) {
            return this.triples().expresses(triple);
        }
    });

}(jQuery));