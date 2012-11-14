(function($, undefined) {

    $.widget("notepad.predicate", {

        options: {
            allowBlankNodes: true
        },

        setUri: function(uri) {
            this.element.attr('rel', uri);
            if (this.getLabel() === undefined) {
                this.insertLabel();
            }
        },
        getUri: function() {
            return this.element.closest('[rel]').attr('rel');
        },
        getLabel: function() {
            return this.element.children('.notepad-label.notepad-predicate-label').data('label');
        },
        insertLabel: function() {
            var element = $('<div class="notepad-predicate-label">').prependTo(this.element).label({uriElement: this.element, uriAttr: "rel"});
        },
        getSubject: function() {
            return this.element.closest('[about]');
        },
        getObjects: function(object) {
            var objects = this.element.children('.notepad-label').filter(function() { return !$(this).hasClass('notepad-predicate-label');});
            if (object) {
                if (object.isUri() || (this.options.allowBlankNodes && object.isBlank())) {
                    objects = objects.filter('[about='+object+']');
                } else if (object.isLiteral()) {
                    objects = objects.filter(function() { return $(this).text() == object; });
                } else if (object.isBlank()) {
                    throw new Error("cannot add a blank node");
                } else {
                    throw new Error("cannot add an unknown object type");
                }
            }
            return objects.map(function(i,e) { return $(e).data('label'); });
        },
        getObjectLocation: function(object) {
            var objects = this.getObjects(object);
            var object;
            if (object.length > 1) {
                throw new Error ("should not have multiple locations for a given object");
            }
            if (objects.length === 0) {
                object = this.insertObject();
            } else {
                object = objects[0];
            }
            return object;
        },
        insertObject: function() {
            return $('<div>').appendTo(this.element).label().data('label');
        },
        add: function(triple) {
            if (this.getUri() != triple.predicate) {
                return;
            }
            var object = this.getObjectLocation(triple.object);
            object.setObject(triple.object);
        },

        triples: function() {
            var triples = new Triples(0);
            if (this.getLabel() !== undefined && this.getLabel().triple() !== undefined) {
                triples.push(this.getLabel().triple());
            }
            _.each(this.getObjects(), function(object) {
                var triple = object.triple();
                if (triple) {
                    triples.push(triple);
                }
            });
            return triples;
        },

        // Set up the widget
        _create : function() {
            this.element.addClass('notepad-predicate');
            if (this.element.attr('rel')) {
                this.setUri(this.element.attr('rel'));
            }
        },
        _destroy : function() {
            this.element.removeClass("notepad-predicate").removeAttr('contenteditable');
        }
    });

}(jQuery));
