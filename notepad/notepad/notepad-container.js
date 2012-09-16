(function($, undefined) {

    var CONTAINER_DEFAULT_PREDICATE_ATTR = 'container-default-predicate';
    var CONTAINER_DEFAULT_PREDICATE_URI = 'rdfs:member';

    $.widget("notepad.container", {

        // Set up the widget
        _create : function() {
            this.element.addClass("notepad-container");

            this._createHeadersContainer();

            if (this.getUri() === undefined) {
                throw "Cannot find a URI for this container";
            }
        },

        _destroy : function() {
            this.element.removeClass("notepad-container").removeAttr('about');
        },

        getUri: function() {
            return this.element.closest('[about]').attr('about');
        },
        getNotepad: function() {
            return this.element.parents('.notepad').data("notepad");
        },
        getEndpoint: function() {
            if (this.endpoint) {
                return this.endpoint;
            }
            return this.getNotepad().getEndpoint();
        },

        getLines: function() {
            return this.element.children('li').map(function(index, line) { return $(line).data('line'); } );
        },
        getAllLines: function() {
          return this.element.find('li').map(function(index, line) { return $(line).data('line'); } );  
        },
        appendLine: function(line) {
            if (line === undefined) {
                line = $('<li>');
            }
            if (line.appendTo === undefined) {
                line = $('<li>').text(line);
            }
            line.appendTo(this.element).line();

            return line.data('line');
        },
        appendUri: function(uri) {
        },
        add: function(triple) {
            if (triple.subject !== this.getUri() || triple.object !== this.getUri()) {
                return;
            }
            if (this.expresses(triple)) {
                return;
            }
            var lineSelector = '['
        },
        getDefaultPredicate: function() {
            var predicate = this.element.attr(CONTAINER_DEFAULT_PREDICATE_ATTR);
            if (predicate===undefined) {
                predicate = CONTAINER_DEFAULT_PREDICATE_URI;
            }
            return predicate;
        },
        
        triples: function() {
            var triples = [];
            _.each(this.getLines(), function(line) {
                $.merge(triples, line.triples());
            });
            return triples;
        },
        
        _updateFromRdf: function(triples) {
            // Update the immediate descendant children
            var container = this;
            $.each(triples, function(index,triple) {
                //if (container.getNotepad().contains(triple)) {
                if (container.getNotepad().expresses(triple)) {
                    // This triple is already displayed
                    return;
                }
                if (container.getNotepad().triples().length >= 50) {
                    // Limit to 50 triples per notepad
                    return;
                }
                if (triple.object.isLiteral()) {
                    // TODO: handle literals somehow
                    return;
                }

                var childUri;
                var direction;
                if (triple.subject == container.getUri()) {
                    childUri = triple.object;
                    direction = FORWARD;
                } else if (triple.object == container.getUri())  {
                    childUri = triple.subject;
                    direction = BACKWARD;
                } else
                if (!childUri) {
                    // This triple does not relate to this container
                    return;
                }

                var selector = 'li[about="'+childUri+'"]';
                var childLines = container.element.find(selector);

                if (childLines.length > 1) {
                    throw "cannot update multiple occurence of the childUri";
                }
                var line;
                if (childLines.length == 1) {
                    line = $(childLines[0]).data('line');

                    //TODO: what about direction?
                    line.setContainerPredicateUri(triple.predicate, direction);  // TODO: handle multiple

                } else {
                    line = container.appendLine();
                    line.setContainerPredicateUri(triple.predicate, direction);  // TODO: handle multiple

                    // TODO: decide: a: should this trigger refreshing its children or b: should we build up a list
                    // TEST: a
                    line.setUri(childUri);
                }
            });
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
            this.getHeadersContainer().css('display','inline');
            this.getHeadersContainer().css('display','block');
            return header.data('column');
        }
    });

}(jQuery));
