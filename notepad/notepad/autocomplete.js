(function($, undefined) {

    function triplesToBrowseResults(callback) {
        return function(triples) {

            // should only get URIs with a notepad:reason triple
            var matches = triples.triples(undefined, 'notepad:reason');

            // value.toString() will be displayed when selecting the menu item
            var results = _.map(matches, function(match) {
                return {label: match.object.toString(), value: triples.connectedTo(match.subject), subject: match.subject };
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
                if (event.originalEvent) {
                    // Consume keyboard events that generateed this 'select' event
                    event.originalEvent.stopPropagation();
                }
                var widget = $(event.target).closest(':notepad-object').data('notepadObject');
                widget.uri().setUri(ui.item.subject, ui.item.description);
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
                .append( $("<pre class='match-description'>").text(item.value.toTurtle()))
                .appendTo( ul );
        },

        // Set up the widget
        _create: function() {
            this._super();
        },
        _destroy : function() {
            this._super();
        },

    });

}(jQuery));
