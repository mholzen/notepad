(function($, undefined) {

    var CONTAINER_DEFAULT_PREDICATE_ATTR = 'container-default-predicate';
    var CONTAINER_DEFAULT_PREDICATE_URI = 'rdfs:member';
    var MAX_DEPTH = 2;
    var MAX_TRIPLES = 500;
    var MAX_TRIPLES_BEFORE_COLLAPSING = 5;
    var MAX_TRIPLES_BEFORE_FILTERING = 10;

    $.widget("notepad.loader", {

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
        getQuery: function() {
            if (this.options.query !== undefined) {
                return this.options.query;
            }
            return $.notepad.queryFromObject(this.getSourceElement());
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

                // if (triples.length > MAX_TRIPLES_BEFORE_COLLAPSING) {
                //     container.option('collapsed', true);
                // }

                // // TODO: it should be up to the object to determine the best way to display itself, given its context
                // if (triples.triples(undefined, "rdf:type", "notepad:imap_import")) {
                //     container.lineTemplate = '<div><span>{{{nmo:sender}}}</span>' + 
                //         '<span class="notepad-column-0">{{{nmo:messageSubject}}}</span><span  class="notepad-column-1">{{{nmo:receivedDate}}}</span></div>';
                // }
                
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

            if (container.getLines().length > MAX_TRIPLES_BEFORE_FILTERING) {
                container._createFilters();
                container.filters().load();
            }

            this._updateLabelsFromRdf(triples);
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
        }


    });

}(jQuery));
















