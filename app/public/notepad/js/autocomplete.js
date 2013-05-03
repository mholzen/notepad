(function($, undefined) {

    function triplesToBrowseResults(callback) {
        return function(triples) {
            // get a map of graphs by subjects
            var results = _.reduce(triples, function(memo, triple) {
                memo[triple.subject] = (memo[triple.subject] || new Triples()).add(triple);
                return memo;
            }, {});

            // get an array of objects, labeled with 'notepad:reason'
            // results: [{label: graph.notepad:reason, value: graph}, ...]
            results = _.map(results, function(graph) {
                return {label: graph.toString(), value: graph};
            });

            // Sort by label length
            results = _.sortBy(results, function(obj) { return obj.label.length; });

            // We're done
            callback(results);
        }
    }

    $.widget("notepad.autocomplete2", $.ui.autocomplete, {

        options: {
            query: $.notepad.queries.find_subject_label_by_label,

            minLength: 2,

            source: function(request,callback) {
                var nbsp = String.fromCharCode(160);
                request.term = request.term.replace(nbsp, ' ');

                this.options.query.execute(this.element.findEndpoint(), request, triplesToBrowseResults(callback));
            },

            select: function(event, ui) {
                if (event.originalEvent) {
                    // Consume keyboard events that generateed this 'select' event
                    event.originalEvent.stopPropagation();
                }

                var triples = ui.item.value;
                var uris = triples.subjects();
                if (uris.length != 1) {
                    throw new Error("cannot determine a single subject from a graph", uri);
                }
                var widget = $(event.target).closest(':notepad-urilabel').data('notepadUrilabel');
                widget.setUri(uris[0], triples);

                // mark any triples resulting from setUri as having been loaded by this session
                if (widget.getNotepad()) {
                    widget.getNotepad().loaded(widget.triples());
                }

                // should: focus on the source text element

                // this.focus();
                // doesn't work because the DOM element is re-created during update

                event.preventDefault();  // prevent the default behaviour of replacing the text with the value.  _updateRdf has taken care of it
            },

        },
        _setOption: function(key, value) {
            this._super(key, value);
            switch (key) {
                case 'query':
                break;
            }
        },
        _renderItem: function( ul, item ) {
          return $( "<li>" )
            .append( $("<a>").append(item.label).append( $('<span class="debug uri">').append('('+item.value.subject()+')') ) )
            .appendTo( ul );
        },

        // Set up the widget
        _create: function() {
            this._super();
        },
        _destroy : function() {
        },

    });

}(jQuery));
