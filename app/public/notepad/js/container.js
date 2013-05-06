(function($, undefined) {

    var MAX_DEPTH = 8;
    var MAX_TRIPLES = 500;
    var MAX_ROWS = 50;
    var MAX_TRIPLES_BEFORE_COLLAPSING = 10;
    var MAX_TRIPLES_BEFORE_FILTERING = 2;

    $.fn.findContainer = function(triple) {
        var selector = '[about="'+triple.subject+'"]';
        return this.find('*').andSelf().filter(selector);        
    }

    $.widget("notepad.container", {

        // See notepad.js for interface

        options: {
            describeElements: true,
            predicate: 'rdfs:member'
        },

        _setOption: function(key, value) {
            this._super(key, value);
        },
        _create: function() {
            this.element.addClass("notepad-container");
            this._createHeadersContainer();
            // this._createFilters();
            if (this.getUri()) {
                this.load();
            }
        },

        _destroy: function() {
            this.element.removeClass("notepad-container").removeAttr('about');
        },

        getSourceElement: function() {
            if (this.options.sourceElement !== undefined) {
                return this.options.sourceElement;
            }
            var closestSubject = this.element.closest('[about]');
            if (closestSubject.length !== 0) {
                return closestSubject;
            }
        },
        getUri: function() {
            var subjectElement = this.getSourceElement();
            if (subjectElement) {
                return subjectElement.attr('about');
            }
        },
        getQuery: function() {
            var query = this.options.query || $.notepad.describeObject(this.getSourceElement());

            if (this.filters()) {
                var filters = this.filters().element.find(":checked").parent().each(function(i,element) {
                    query = query.appendTriplePattern($(element).data('notepadFact').triples());
                });
            }
            return query;
        },
        getNotepad: function() {
            return this.element.parents('.notepad-session').data("notepadNotepad");
        },
        getParent: function() {
            var parent = this.element.parents(".notepad-container").data('notepadContainer');
            if (parent) {
                return parent;
            }
            return this.getNotepad();
        },
        getDepth: function() {
            return this.element.parents(".notepad-container").length;
        },
        getLines: function() {
            return this.element.children('li').map(function(index, line) { return $(line).data('notepadLine'); } );
        },
        getAllLineElements: function() {
            return this.element.find('li');
        },
        getAllLines: function() {
          return this.getAllLineElements().map(function(index, line) { return $(line).data('notepadLine'); } );  
        },
        appendLine: function(line, triple) {
            var line = line || $("<li>");
            if (line.appendTo === undefined) {
                line = $('<li>').text(line);
            }
            line.appendTo(this.element);
            if (line.data('notepadLine') === undefined) {
                line.line({initialTriple: triple});
            }
            line = line.data('notepadLine');
            return line;
        },

        // add, no matter whether it should be expressed by the query or not
        // find whether this triple is expressed or not
        addTriple: function(triple) {
            if (this.triples().expresses(triple)) {
                console.debug("Triple already expressed in the container");
                return;
            }
            // We are creating a new line, no matter what, because a container can have several times the same predicate with different objects or even the same predicate
            var line = this.appendLine();
            line.update(triple);
            return line;
        },

        add: function(triple) {
            if (this.triples().expresses(triple)) {
                console.debug("Triple already expressed in the container");
                return;
            }
            var lineSelector = new $.fn.Selector(this.getUri(), triple);
            if ( lineSelector.direction === undefined ) {
                console.debug("Triple does not relate to this container");
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
                line.setUri(lineSelector.line);
            }
            return line;
        },

        addSubjects: function(triples) {
            var uri = this.getUri();
            var predicate = this.options.predicate;
            var memberTriples = toTriples(triples.subjects().map(function(subject) {
                return toTriple(uri, predicate, subject);
            }));
            memberTriples.add(triples);
            this._updateFromRdf(memberTriples);
        },
        
        triples: function() {
            var triples = new Triples();
            _.each(this.getLines(), function(line) {
                $.merge(triples, line.triples());
            });

            return triples;
        },
        triplesInDomPath: function() {
            var object = this.getSourceElement().closest(":notepad-object");
            if (object.length === 0) {
                return new Triples();
            }
            return object.data('notepadObject').triplesInDomPath();
        },

        refresh: function() {
            if (this.getUri() === undefined) {
                return;
            }
            return this.load();
        },
        load: function() {
            var endpoint = this.element.findEndpoint();
            if (!endpoint) {
                return;
            }

            var container = this;
            var query = this.getQuery();
            return query.execute(endpoint, {}, function(triples) {
                if (triples.length > MAX_TRIPLES_BEFORE_COLLAPSING) {
                    container.option('describeElements', false);
                }
                if (!container.element.findEndpoint()) {
                    // consider: refactor into query.execute
                    console.warn('no more endpoint -- might have been removed from the DOM -- ignoring');
                    return;
                }
                container._updateFromRdf(triples);
            });
        },
        loadAll: function() {
            // shoud: refactor with load()
            var endpoint = this.element.findEndpoint();
            if (!endpoint) {
                return;
            }
            return this.getQuery().execute(endpoint, {}, this.addSubjects.bind(this));
        },
        unload: function() {
            if (this.getNotepad()) {
                this.getNotepad().unloaded(this.triples());
            }
            this.element.children('li').remove();
        },
        update: function(triples) {
            return this._updateFromRdf(triples);
        },
        // deprecated-by: update
        _updateFromRdf: function(triples) {
            // Update the immediate descendant children
            var container = this;

            console.log("[container]","updating with ", triples.length, " triples");

            triples.sort();

            if (triples.length > MAX_ROWS) {
                console.debug("too many rows.  Displaying only " + MAX_ROWS)
                triples = triples.slice(-MAX_ROWS);
            }

            _.each(triples, function(triple) {
                console.debug('updating for triple: '+triple.toString());
                if (container.getDepth() > MAX_DEPTH) {
                    console.info("Max depth reached");
                    return;
                }
                if (container.triplesInDomPath().contains(triple)) {
                    console.debug("Triple already expressed in DOM path", triple);
                    return;
                }
                if (container.getNotepad() && container.getNotepad().triples().length >= MAX_TRIPLES) {
                    console.warn("Max triple count reached");
                    return;
                }                

                if (triple.predicate == "rdfs:label") {
                    // Ignore labels, because they were most likely displayed above.  dev:techdebt
                    // This prevents labels from appearing as a duplicate from the label of the parent node.
                    return;
                }

                // this.add(triple);
                var lineSelector = new $.fn.Selector(container.getUri(), triple);
                if ( lineSelector.direction === undefined ) {
                    console.debug("Triple does not relate to this container");
                    return undefined;
                }

                var childLines = container.element.find(":notepad-line").filter(lineSelector.filter());
                if (childLines.length > 1) {
                    throw new Error("cannot update multiple occurence of the childUri");
                }
                var line;
                if (childLines.length == 1) {
                    line = $(childLines[0]).data('notepadLine');
                } else {
                    line = container.appendLine();
                }
                
                // refactor to: line.update(triple);
                line.setContainerPredicateUri(triple.predicate, lineSelector.direction);
                if (triple.object.isLiteral()) {
                    line.setLineLiteral(triple.object);
                } else {
                    line.setUri(lineSelector.line);
                }

                if (container.getNotepad()) {
                    container.getNotepad().loaded(triple);
                }

            });

            this._updateLabelsFromRdf(triples);
            this.element.trigger('contentchanged');
        },
        _updateLabelsFromRdf: function(triples) {
            // Update the representations of all children line
            var container = this;
            $.each(triples, function(index,triple){
                if (triple.predicate.toString() !== 'rdfs:label') {
                    return;
                }
                // Find a line with the subject as URI
                container.element.find(':notepad-urilabel[about="'+triple.subject+'"]').each(function(i,urilabel) {
                    $(urilabel).data('notepadUrilabel').update(triples);       // could optimize to only related triples?
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

        //
        // Columns
        //

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
            return _.map(this.getHeaders(), function(header) { return $(header).data('notepadColumn'); });
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
            return header.data('notepadColumn');
        },

        // 
        // Filters
        //
        filters: function() {
            return this.element.children('.notepad-filters').data('notepadContainer2');
        },
        _createFilters: function() {
            
            // beta:filters
            // return;

            if (this.element.findEndpoint())
            if (this.filters()) {
                return;
            }
            var filters = $('<div class="notepad-filters">').prependTo(this.element).container2().data('notepadContainer2');
            var container = this;

            this.element.on('contentchanged', function(event) {
                event.stopPropagation();
                var endpoint = container.element.findEndpoint()
                if (!endpoint) {
                    return false;
                }

                if (container.getLines().length < MAX_TRIPLES_BEFORE_FILTERING) {
                    console.info("[filters]", "too few lines so doing nothing with filters");
                    return false;
                }

                // Remove unselected filters
                filters.element.find("input:not(:checked)").parent().remove();

                var about = new Resource(container.getUri());

                $.notepad.clusterQuery.execute(endpoint, {about: about.toSparqlString()}, function(triples) {
                    filters.addAllTriples(triples);

                    // if (container.getNotepad()) {
                    //     container.getNotepad().loaded(triples);     // to ensure that filter triples are not counted as deleted
                    // }

                    // dev:techdebt
                    // This could be instead modified by setting a triple in the endpoint of the container that defines the label for ... as being the <input> element
                    filters.element.children('.notepad-fact').prepend('<input type="checkbox">');
                    filters.element.find('input').click(function() {
                        container.element.find(":notepad-line").remove();
                        container.load();
                    });
                });
                return false;
            });
        },
        toggleSortable: function() {
            var sortable = this.element.data('uiSortable');
            if (!sortable) {
                this.element.sortable();
                return;
            }
            sortable.option('disabled', ! sortable.option('disabled'));
        },
        reset: function() {
            this.unload();
            this.appendLine();
            return this;
        }
    });

}(jQuery));
