(function($, undefined) {

    var CONTAINER_DEFAULT_PREDICATE_ATTR = 'container-default-predicate';
    var CONTAINER_DEFAULT_PREDICATE_URI = 'rdfs:member';
    var MAX_DEPTH = 2;
    var MAX_TRIPLES = 500;
    var MAX_TRIPLES_BEFORE_COLLAPSING = 5;
    var MAX_TRIPLES_BEFORE_FILTERING = 10;

    $.widget("notepad.container", {

        // See notepad.js for interface

        options: {
        },

        _setOption: function(key, value) {
            this._super(key, value);        // We have jquery-ui 1.9
        },
        _create: function() {
            this.element.addClass("notepad-container");

            this._createHeadersContainer();
        },

        _destroy: function() {
            this.element.removeClass("notepad-container").removeAttr('about');
        },

        // A container knows its sourceElement, the element used to obtain the initial query
        getSourceElement: function() {
            if (this.options.sourceElement !== undefined) {
                return this.options.sourceElement;
            }
            if (this.element.closest('[about]').length !== 0) {
                return this.element.closest('[about]');
            }
            throw new Error("cannot determine my source element");
        },
        getUri: function() {
            return this.getSourceElement().attr('about');
        },
        getQuery: function() {
            if (this.options.query !== undefined) {
                return this.options.query;
            }
            return $.notepad.queryFromObject(this.getSourceElement());
        },
        getNotepad: function() {
            return this.element.parents('.notepad').data("notepad");
        },
        getParent: function() {
            var parent = this.element.parents(".notepad-container").data("notepad-container");
            if (parent) {
                return parent;
            }
            return this.getNotepad();
        },
        getDepth: function() {
            return this.element.parents(".notepad-container").length;
        },
        getLines: function() {
            return this.element.children('li').map(function(index, line) { return $(line).data('line'); } );
        },
        getAllLineElements: function() {
            return this.element.find('li');
        },
        getAllLines: function() {
          return this.getAllLineElements().map(function(index, line) { return $(line).data('line'); } );  
        },
        appendLine: function(line) {
            if (line === undefined) {
                line = $('<li>');
            }
            if (line.appendTo === undefined) {
                line = $('<li>').text(line);
            }
            //line.appendTo(this.element).line({initialTriple: triple});
            line.appendTo(this.element).line();

            return line.data('line');
        },
        appendUri: function(uri) {
        },

        // add, no matter whether it should be expressed by the query or not
        // find whether this triple is expressed or not
        addTriple: function(triple) {
            if (this.triples().expresses(triple)) {
                log.debug("Triple already expressed in the container");
                return;
            }
            // We are creating a new line, no matter what, because a container can have several times the same predicate with different objects or even the same predicate
            var line = this.appendLine();
            line.setTriple(triple);
            return line;
        },

        add: function(triple) {
            if (this.triples().expresses(triple)) {
                log.debug("Triple already expressed in the container");
                return;
            }
            var lineSelector = new $.fn.Selector(this.getUri(), triple);
            if ( lineSelector.direction === undefined ) {
                log.debug("Triple does not relate to this container");
                return;
            }
            var lines = this.element.find(lineSelector);
            if (lines.length != 0) {
                throw new Error("triple not expressed by container yet appears in it");
            }
            if (lineSelector.direction === BACKWARD && triple.object.isLiteral()) {
                throw new Error("cannot add a backward triple with a literal");
            }
            var line = this.appendLine();
            line.setContainerPredicateUri(triple.predicate, lineSelector.direction);

            if (triple.object.isLiteral()) {
                line.setLineLiteral(triple.object);
            } else {
                line.setUri(lineSelector.lineUri);
            }
            return line;
        },
        getDefaultPredicate: function() {
            var predicate = this.element.attr(CONTAINER_DEFAULT_PREDICATE_ATTR);
            if (predicate === undefined) {
                predicate = CONTAINER_DEFAULT_PREDICATE_URI;
            }
            return predicate;
        },
        
        triples: function() {
            var triples = new Triples(0);
            _.each(this.getLines(), function(line) {
                $.merge(triples, line.triples());
            });
            return triples;
        },
        reverseTriples: function() {
            var container = this;
            return this.triples().filter(function(triple) { return triple.object.toString() == container.getUri(); });
        },
        refresh: function() {
            if (this.getUri() === undefined) {
                return;
            }
            return this.load();
        },
        load: function() {
            var container = this;
            this.getQuery()(function(triples) {

                if (triples.length > MAX_TRIPLES_BEFORE_COLLAPSING) {
                    container.option('collapsed', true);
                }

                // TODO: it should be up to the object to determine the best way to display itself, given its context
                if (triples.triples(undefined, "rdf:type", "notepad:imap_import").length !== 0) {
                    container.lineTemplate = '<div><span>{{{nmo:sender}}}</span>' + 
                        '<span rel="nmo:messageSubject" class="notepad-column-0">{{{nmo:messageSubject}}}</span><span  class="notepad-column-1">{{{nmo:receivedDate}}}</span></div>';
                }
                container._updateFromRdf(triples);
            });
        },
        _updateFromRdf: function(triples) {
            // Update the immediate descendant children
            var container = this;

            _.each(triples, function(triple) {
                log.debug('updating for triple'+triple.toString());
                if (container.getDepth() > MAX_DEPTH) {
                    log.debug("Max depth reached");
                    return;
                }
                if (container.getNotepad() && container.getNotepad().triples().length >= MAX_TRIPLES) {
                    log.warn("Max triple count reached");
                    return;
                }                
                if (container.getNotepad() && container.getNotepad().expresses(triple)) {
                    log.debug("Triple already expressed in the notepad");
                    return;
                }

                // this.add(triple);
                var lineSelector = new $.fn.Selector(container.getUri(), triple);
                if ( lineSelector.direction === undefined ) {
                    log.debug("Triple does not relate to this container");
                    return undefined;   // this triple does not relate to this container
                }

                var childLines = container.element.find(lineSelector);
                if (childLines.length > 1) {
                    throw new Error("cannot update multiple occurence of the childUri");
                }
                var line;
                if (childLines.length == 1) {
                    line = $(childLines[0]).data('line');
                } else {
                    line = container.appendLine();
                }
                if (triple.object.toString() === 'http://localhost:3030/dev/699d1fd9-13f0-11e2-90e8-c82a1402d8a8') {
                    console.log('setting pred uri for our line ');
                    console.log(triple.predicate.toString());
                }
                line.setContainerPredicateUri(triple.predicate, lineSelector.direction, triple);

                if (triple.object.isLiteral()) {
                    line.setLineLiteral(triple.object);
                } else {
                    line.setUri(lineSelector.lineUri);
                }

            });

            this._updateLabelsFromRdf(triples);

            if (container.getLines().length > MAX_TRIPLES_BEFORE_FILTERING) {
                container._createFilters();
            }
        },
        _updateLabelsFromRdf: function(triples) {
            // Update the representations of all children line
            var container = this;
            $.each(triples, function(index,triple){
                if (triple.predicate != 'rdfs:label') {
                    return;
                }
                // Find a line with the subject as URI
                container.element.find('li[about="'+triple.subject+'"]').each(function(i,li) {
                    $(li).data('line').setLineLiteral(triple.object);
                })
            });
        },
        sort : function() {
            throw "not yet"
        },
        sortBy: function() {
            if (this.getLines().length <= 1) {
                return [];
            }
            return [ function(a,b) { return a>=b; },
                     function(a,b) { return b>=a; }];
        },

        _createHeadersContainer: function() {
            this.element.prepend($('<div>').addClass('notepad-headers-container'));
        },
        getHeadersContainer: function() {
            return this.element.children('.notepad-headers-container');
        },
        getHeaders: function() {
            return this.getHeadersContainer().children('.notepad-column'); // Shouldn't this come from notepad-column?
        },
        getColumns: function() {
            return _.map(this.getHeaders(), function(header) { return $(header).data('column'); });
        },
        getHeaderPosition: function(header) {
            return this.getHeaders().index(header);
        },

        appendColumn: function(predicateUri) {
            this.getHeadersContainer().append('<div class="notepad-subjects" style="display: inline-block;">Subjects</div>');
            // create header element
            var header = $('<div>').appendTo(this.getHeadersContainer());

            header.text('example');

            // Turn into a column
            header.column();
            header.text(predicateUri);

            // The following appears necessary to: layout the header on the same line as the subject head
            this.getHeadersContainer().css('display', 'inline');
            this.getHeadersContainer().css('display', 'block');
            return header.data('column');
        },


        // 
        // Filters
        //
        _createFilters: function() {
            if (this.filters() !== undefined) {
                return;
            }
            // var filter = $('<select multiple size="10" class="notepad-filters">').prependTo(this.element).container2();
            var filter = $('<div class="notepad-filters">').prependTo(this.element).container2();
            var container2 = filter.data('container2');
            var about = new Resource(this.getUri());
            var clusters = $.notepad.clusterQuery.execute(this.element.findEndpoint(), {about: about.toSparqlString()}, function(triples) {
                container2.addAllTriples(triples);

                // dev:techdebt
                // This could be instead modified by setting a triple in the endpoint of the container that defines the label for ... as being the <input> element
                //filter.find('.notepad-fact > .notepad-predicate[rel="rdfs:label"] > .notepad-predicate-label').append('<input type=checkbox>');
                filter.find('.notepad-fact').prepend('<input type=checkbox>');
            });
        },
        filters: function() {
            return this.element.children('.notepad-filters').data('container2');
        }



    });

}(jQuery));
















