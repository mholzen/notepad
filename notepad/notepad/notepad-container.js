(function($, undefined) {

    var CONTAINER_DEFAULT_PREDICATE_ATTR = 'container-default-predicate';
    var CONTAINER_DEFAULT_PREDICATE_URI = 'rdfs:member';

    $.widget("notepad.container", {

        getUri: function() {
            return this.element.closest('[about]').attr('about');
        },
        getNotepad: function() {
            return this.element.parents('.notepad').data("notepad");
        },

        getLines: function() {
            return this.element.children('li').map(function(index, line) { return $(line).data('line'); } );
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
        getDefaultPredicate: function() {
            var predicate = this.element.attr(CONTAINER_DEFAULT_PREDICATE_ATTR);
            if (predicate===undefined) {
                predicate = CONTAINER_DEFAULT_PREDICATE_URI;
            }
            return predicate;
        },
        
        triples: function() {
            return this.getLines().map(function(index,line) {
                return line.triples();
            });
        },
        
        _updateFromRdf: function(triples) {
            // Update the immediate descendant children
            var container = this;
            $.each(triples, function(index,triple) {
                if (triple.subject != container.getUri()) {
                    return; // This triple will not affect this container
                }
                if (container.getNotepad().contains(triple)) {
                    return;
                }

                // Update a line based on the object
                if (!triple.object.isLiteral()) {
                    var selector = 'li[about="'+triple.object+'"]';
                    var lines = container.element.find(selector);

                    // If there are multiple lines, we need additional triples to identify the lines to find or create
                    if (lines.length > 1) {
                        throw "multiple lines of identical RDF: requires more triples to distinguish them";
                    }
                    var line;
                    if (lines.length == 1) {
                        line = $(lines[0]).data('line');
                    } else {
                        line = container.appendLine();
                        // TODO: decide: a: should this trigger refreshing its children or b: should we build up a list
                        // TEST: a
                        line.setUri(triple.object);
                    }
                    line.setContainerPredicateUri(triple.predicate);  // TODO: handle multiple
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

        // headers: function() {
        //     return this.element.children('.notepad-header');
        // },
        // createHeaders: function() {
        //     var headers = $('<div>').addClass('notepad-headers');
        //     this.element.prependTo(headers);
        //     return headers;
        // },

        // header: function(id) {
        //     return headers().find('.notepad-header-'+id);
        // },
        // createHeader: function(id) {
        //     var header = $('<div>').addClass('notepad-column-'+id);
        //     this.getHeaders().appendTo(header);
        //     return header
        // },

        _createHeadersContainer: function() {
            this.element.prepend($('<div>').addClass('notepad-headers-container'));
        },
        getHeadersContainer: function() {
            return this.element.children('.notepad-headers-container');
        },
        getHeaders: function() {
            return this.getHeadersContainer().children('.notepad-header');
        },
        appendHeader: function() {
            var header = $('<div>').addClass('notepad-header'); // maybe this should come from the column object
            header.appendTo(this.getHeadersContainer());
            return header;
        },
        getColumns: function() {
            return _.map(this.getHeaders(), function(header) { return $(header).data('column'); });
        },
        getColumnPosition: function(column) {
            return 1;   // TODO: incomplete
        },

        appendColumn: function(predicateUri) {
            var header = this.appendHeader();
            var column = header.column();

            return column.data('column');
        }
    });

}(jQuery));
