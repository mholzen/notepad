(function($, undefined) {

    $.widget("notepad.object", {

        // An object is a DOM element that participates in a triple as the object, i.e. either as a literal or as a URI/label combination.

        getNotepad: function() {
            return this.element.parents('.notepad').data("notepad");
        },
        setSubject: function(subject) {
            this.subject = subject;
        },
        getSubject: function() {
            return this.subject;
        },
        getSubjectUri: function() {
            if (this.subject === undefined) {
                throw "no subject defined";
            }
            if (this.subject.getUri) {
                // subject is a widget
                return this.subject.getUri();
            }
            if (this.subject.attr['about']) {
                return this.subject.attr['about'];
            }
            throw "cannot determine subject's uri";
        },

        setPredicate: function(predicate) {
            this.predicate = predicate;
        },
        getPredicateUri: function() {
            if (this.predicate === undefined) {
                throw "no predicate defined";
            }
            if (this.predicate.getUri) {
                // predicate is a widget
                return this.predicate.getUri();
            }
            if (this.predicate.attr['rel']) {
                return this.predicate.attr['rel'];
            }
            throw "cannot determine predicate's uri";
        },

        // Object Uri        
        getObjectUri: function() {
            return this.element.attr("about");
        },
        _setObjectUri: function(uri) {
            this.element.attr('about',uri);
            return this;
        },      
        setObjectUri: function(uri) {
            this._setObjectUri(uri);
            
            // Setting the URI should update the line representation
            var object = this;
            this.getNotepad().getRdfBySubject(uri, function(triples) {
                object._updateFromRdf(triples);
            });
        },
        setObjectLabel: function(label) {
            this.element.text(label);
        },
        _updateFromRdf: function(triples) {
            var object = this;
            $.each(triples, function(index,triple) {
                if (triple.subject != object.getUri() || triple.predicate != 'rdfs:label') {
                    return;
                }
                object.setObjectLabel(triple.object);
            });
        },

        getObjectLiteral: function() {
            // not yet implemented
            return undefined;
        },
        getObject: function() {
            // TODO: handle literals, somehow, I think
            return this.getObjectUri();
        },
        getTriple: function() {
                return new Triple(this.getSubjectUri(), this.getPredicateUri(), this.getObject());
        },

        // Set up the widget
        _create : function() {

            // Object
            this.element.addClass('notepad-object').attr('contenteditable', 'true');

            // on change, set the URI if it's not yet set
            // => new objects that are not changed do not receive a URI
            var object = this;
            this.element.change(function(event) {
                if (object.getObjectUri() === undefined) {
                    object._setObjectUri($.fn.notepad.getNewUri());
                }
            });

            var notepad = this.getNotepad();
            this.element.autocomplete({
                source: function(term,callback) {
                    notepad.getSubjectsLabelsByLabel(term.term,callback);
                },
                select: function(event, ui) {
                    var object = $(event.target).closest('.notepad-object').data('object');
                    object.setObjectUri(ui.item.value);
                    object.setObjectLabel(ui.item.label);
                    event.preventDefault();  // prevent the default behaviour of replacing the text with the value
                }
            });
        },
        _destroy : function() {
            this.element.removeClass("notepad-object").removeAttr('contenteditable');
        },

    });

}(jQuery));
