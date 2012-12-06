(function($, undefined) {

    var CONTAINER_DEFAULT_PREDICATE_ATTR = 'container-default-predicate';
    var CONTAINER_DEFAULT_PREDICATE_URI = 'rdfs:member';
    var MAX_DEPTH = 4;
    var MAX_TRIPLES = 500;
    var MAX_TRIPLES_BEFORE_COLLAPSING = 10;
    var MAX_TRIPLES_BEFORE_FILTERING = 10;

    $.widget("notepad.container", {

        // See notepad.js for interface

        options: {
            describeElements: true,
        },

        _setOption: function(key, value) {
            this._super(key, value);        // We have jquery-ui 1.9
        },
        _create: function() {
            this.element.addClass("notepad-container");
            this._createHeadersContainer();
            this._createFilters();
        },

        _destroy: function() {
            this.element.removeClass("notepad-container").removeAttr('about');
        },

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
            var query = this.options.query || $.notepad.describeObject(this.getSourceElement());

            if (this.filters()) {
                //var filters = this.filters().element.find(":checked").triples();
                var filters = this.filters().element.find(":checked").parent().each(function(i,element) {
                    query = query.appendTriplePattern($(element).data('fact').triples());
                });
            }
            return query;
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
        getDistanceToLastQUery: function() {
            return this.element.parents(".notepad-load-source").length;
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
        appendLine: function(line, triple) {
            line = line || $("<li>");
            if (line.appendTo === undefined) {
                line = $('<li>').text(line);
            }
            line.appendTo(this.element);
            if (line.data('line') === undefined) {
                line.line({initialTriple: triple});
            }
            line = line.data('line');
            line._ensureSubjectUriExists();
            return line;
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
            var triples = new Triples();
            _.each(this.getLines(), function(line) {
                $.merge(triples, line.triples());
            });

            //$.merge(triples, this.filters().triples());  // important to avoid filter triples appearing as deleted

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
            var query = this.getQuery();

            // When this URI is in our root path, it was already loaded there.
            // if (this.element.parent().parent().closest('[about='+ $.notepad.toUri(query.context.about)+']').length > 0) {
            //     log.debug("decline load to avoid repeat", this.element.parent());
            //     log.debug(this.element.parent().parent());
            //     return;
            // }

            log.debug("describe(", $.notepad.toUri(query.context.about), ") into ", this.element[0], query);

            query.execute(this.element.findEndpoint(), {}, function(triples) {

                log.debug("received ", triples.length, " triples from describe(", $.notepad.toUri(query.context.about), ")" );

                if (triples.length > MAX_TRIPLES_BEFORE_COLLAPSING) {
                    container.option('describeElements', false);
                }

                container._updateFromRdf(triples);

            });
        },
        _updateFromRdf: function(triples) {
            // Update the immediate descendant children
            var container = this;

            log.debug("updating container with ", triples.length, " triples.");

            triples.sort();

            _.each(triples, function(triple) {
                log.debug('updating for triple: '+triple.toString());
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
                    return undefined;
                }

                var childLines = container.element.find(lineSelector);
                if (childLines.length > 1) {
                    throw new Error("cannot update multiple occurence of the childUri");
                }
                var line;
                if (childLines.length == 1) {
                    log.debug("Using existing line for triple");
                    line = $(childLines[0]).data('line');
                } else {
                    log.debug("Adding new line");
                    line = container.appendLine(undefined, triple);
                }
                
                line.setContainerPredicateUri(triple.predicate, lineSelector.direction, triple);

                if (triple.object.isLiteral()) {
                    line.setLineLiteral(triple.object);
                } else {
                    line.setUri(lineSelector.lineUri);
                }

                if (container.getNotepad()) {
                    container.getNotepad().loaded(triple);
                }

            });

            this._updateLabelsFromRdf(triples);

            log.debug('triggering contentchanged on ', this.getUri());
            this.element.trigger('contentchanged');
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
        filters: function() {
            return this.element.children('.notepad-filters').data('container2');
        },
        _createFilters: function() {
            if (this.filters() !== undefined) {
                return;
            }
            var filters = $('<div class="notepad-filters">').prependTo(this.element).container2().data('container2');
            var container = this;

            this.element.on('contentchanged', function(event) {
                log.debug('container lines:', container.getLines().length);
                event.stopPropagation();
                if (container.getLines().length < MAX_TRIPLES_BEFORE_FILTERING) {
                    log.debug("too few lines so doing nothing with filters");
                    return;
                }

                // Remove unselected filters
                filters.element.find("input:not(:checked)").parent().remove();

                var about = new Resource(container.getUri());

                $.notepad.clusterQuery.execute(container.element.findEndpoint(), {about: about.toSparqlString()}, function(triples) {
                    filters.addAllTriples(triples);

                    // if (container.getNotepad()) {
                    //     container.getNotepad().loaded(triples);     // to ensure that filter triples are not counted as deleted
                    // }

                    // dev:techdebt
                    // This could be instead modified by setting a triple in the endpoint of the container that defines the label for ... as being the <input> element
                    filters.element.find('.notepad-fact').prepend('<input type="checkbox">');
                    filters.element.find('input').click(function() {
                        container.element.find(":notepad-line").remove();
                        container.load();
                    });
                });
            });
        },
    });

}(jQuery));
















