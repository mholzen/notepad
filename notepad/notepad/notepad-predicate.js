(function($, undefined) {

    $.widget("notepad.predicate", {

        // An predicate is a DOM element that participates in a triple as the predicate
        // It maintains consistency between the label and the URI

        getNotepad: function() {
            return this.element.closest('.notepad').data("notepad");
        },

        _setPredicateUri: function(uri) {
            this.element.attr('rel',uri);            
        },
        _setPredicateLabel: function(label) {
            this.element.text(label);
        },
        setPredicateUri: function(uri) {
            this._setPredicateUri(uri);

            var line = this;

            this.getNotepad().getLabels(uri, function(labels) {
                if (labels.length > 1) {
                    throw "More than one label for a given uri ("+labels+")";
                }
                if (labels.length == 0) {
                    throw "Can't find a label for a predicate uri";
                }
                line._setPredicateLabel(labels[0]);
            });
        },
        setPredicateLabel: function(label) {
            this._setPredicateLabel(label);
            var line = this;
            this.getNotepad().getPredicatesLabelsByLabel(label,function(results) {
                var uri;
                if (results.length > 1) {
                    throw "More than one predicate with the same label ("+results+")";
                }
                if (results.length == 0) {
                    uri = $.fn.notepad.getNewUri();
                }
                line._setPredicateUri(uri);
            });
        },
        getPredicateLabel: function() {
            return this.element.text();
        },
        getPredicateUri: function() {
            var predicateUri = {
                uri: this.element.attr('rel'),
                element: this.element
            };
            predicateUri.__proto__.toString = function() { return this.uri; }
            return predicateUri;
        },
        _getPredicateUriByLabel: function(label) {
            var uri = this.getContainer().predicateMap[label];
            if (uri === undefined) {
                throw "cannot find a uri matching the label " + label;
            }
            return uri;
        },      
        _getPredicateLabelByUri: function(uri) {
            var map =  this.getContainer().predicateMap;
            for (var label in map) {
                if (map[label] == uri) {
                    return label;
                }
            }
            throw "cannot find a label from the URI "+uri;
        },

        // Set up the widget
        _create : function() {

            this.element.addClass('notepad-predicate').attr('contenteditable', 'true');

            // How do change() and autocomplete() interact?
            var notepad = this.getNotepad();
            this.element.change(function(event) { 
                line.setPredicateLabel( $(event.target).val() );
            });

            // Must turn on autocomplete *after* the element has
            // been added to the document
            this.element.autocomplete({
                source: function(term,callback) {
                    notepad.endpoint.getPredicatesLabelsByLabel(term.term,callback);
                },

                select : function(event,ui) {
                    var line = $(event.target).closest('.notepad-predicate').data('predicate');
                    line._setPredicateLabel(ui.item.label);
                    line._setPredicateUri(ui.item.value);
                    event.preventDefault();  // the default behaviour replaces the text with the value
                }
            });
        },
        _destroy : function() {
            this.element.removeClass("notepad-predicate").removeAttr('contenteditable');
        },

    });

}(jQuery));
