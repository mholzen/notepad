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
            query: new Query($.notepad.templates.find_subject_label_by_label),

            minLength: 2,

            source: function(request,callback) {
                this.options.query.execute(this.element.findEndpoint(), request, triplesToBrowseResults(callback));
            },

            select: function(event, ui) {
                var triples = ui.item.value;
                var uris = triples.subjects();
                if (uris.length != 1) {
                    throw new Error("cannot determine a single subject from a graph", uri);
                }
                var widget = $(event.target).closest(':notepad-object').data('notepadObject');
                widget.uri().setUri(uris[0], triples);
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
                .append( $("<a>").append(item.label) )
                .append( $("<div>").append(item.value.pp()))
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
