(function($, undefined) {

    $.widget("notepad.predicate", {

        // Given a DOM element
            // that has a subject URI defined (that is within an element that has an '[about]' uri)
            // getSubject()

        // It manages the relationship between
            // (a) a predicate URI (ie "the [rel] or [rev] attribute of the element"), (getUri(), setUri(uri), isForward(), toggleDirection(forward))
            // and
            // (b) its representation (getLabel(), insertLabel())
                // (via the a class for the predicate URI (label))
                // can create a new label for the predicate: element.label({uriElement: , uriAttr: })

        // It manages the relationship between
            // (a) a collection of objects that relate to this predicate
                // can create a new object: element.label()
                // object.isUri, object.isLiteral, object.isBlank 
                // label.triple
                // label.attr('about')
            // and
            // (b)


        options: {
            objectFactory: $.fn.label, 
            allowBlankNodes: true
        },
        getSubjectUri: function() {;
            return this.element.closest('[about]').attr('about');
        },
        isForward: function() {
            if (this.element.attr('rel')) {
                return true;
            } else if (this.element.attr('rev')) {
                return false;
            }
            return undefined;
        },
        toggleDirection: function(forwardOrBackward) {
            if (forwardOrBackward === undefined) {
                forwardOrBackward = ! this.isForward();
            }
            if (forwardOrBackward) { // setting it forward
                var uri = this.element.attr('rev');
                this.element.attr('rel', uri).removeAttr('rev');
            } else { // setting it backward
                var uri = this.element.attr('rel');
                this.element.attr('rev', uri).removeAttr('rel');
            }
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
            var element = $('<div class="notepad-predicate-label">').prependTo(this.element);
            this.options.objectFactory.call($(element), {uriElement: this.element, uriAttr: 'rel'});  // TODO: when backward, => ?
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
            var attrName = this.element.attr('rev') ? "rev" : "rel";
            var uri;
            if (uri = this.element.attr(attrName)) {
                this.setUri(uri);
            }
        },
        _destroy : function() {
            this.element.removeClass("notepad-predicate").removeAttr('contenteditable');
        }
    });

}(jQuery));
