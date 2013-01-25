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
            allowBlankNodes: true,
        },
        getSubjectElement: function() {
            return this.element.closest('[about]');
        },
        getSubjectUri: function() {
            return this.getSubjectElement().attr('about');
        },
        getAttribute: function() {
            if (this.element.attr('rel')) {
                return "rel";
            } else if (this.element.attr('rev')) {
                return "rev";
            }
            return "rel";
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
            this.getLabel().option('uriAttr', this.getAttribute());
        },
        getOperation: function() {
            return this.element.hasClass('delete') ? "delete" : "update";
        },
        _setUri: function(uri) {
            this.element.attr(this.getAttribute(), uri);
        },
        setUri: function(uri) {
            this._setUri(uri);
            this.getLabel().load();
        },
        getUri: function() {
            return this.element.attr(this.getAttribute())
        },
        newUri: function(predicate) {
            predicate = predicate || "new predicate";
            this._setUri($.notepad.getNewUri());
            this.getLabel().setLiteral(predicate);
        },
        newUriFromTriples: function(triples) {
            this._setUri($.notepad.getNewUri());
            this.getLabel()._updateFromRdf(triples);
        },
        _createLabel: function() {
            var element = $('<div class="notepad-predicate-label">').prependTo(this.element);
            this.options.objectFactory.call($(element), {uriElement: this.element, uriAttr: this.getAttribute()});
            return element.data('notepadLabel');
        },
        getLabel: function() {
            var label = this.element.children('.notepad-label.notepad-predicate-label').data('notepadLabel');
            if (!label) {
                label = this._createLabel();
            }
            return label;
        },
        getObjects: function(object) {
            var objects = this.element.children('.notepad-label, [about]').filter(function() { return !$(this).hasClass('notepad-predicate-label');});
            if (object) {
                if (object.isUri() || (this.options.allowBlankNodes && object.isBlank())) {
                    objects = objects.filter(function() {
                        var label = $(this).data('notepadLabel');
                        if (label && label.getUri() == undefined) {
                            // Include objects with an "undefined" uri
                            return true;
                        }
                        if (label && label.getUri() == object.getUri()) {
                            return true;
                        }
                        return $(this).attr('about') == object.getUri();
                    });
                } else if (object.isLiteral()) {
                    objects = objects.filter(function() {
                        var label = $(this).data('notepadLabel');
                        if (label && label.getLiteral() == undefined) {
                            // Include objects with an "undefined" literal
                            return true;
                        }
                        if (label && label.getLiteral() == object.getLiteral()) {
                            return true;
                        }
                        return ($(this).text() == object);
                    });
                } else if (object.isBlank()) {
                    throw new Error("cannot add a blank node");
                } else {
                    throw new Error("cannot add an unknown object type");
                }
            }
            return objects.map(function(i,e) { return $(e).data('notepadLabel'); });
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
            return $('<div class="notepad-object3">').appendTo(this.element).label().data('notepadLabel');
        },
        ensureOneObject: function() {
            if (this.getObjects().length > 0) { return; }
            this.insertObject();
        },
        add: function(triple) {
            if (this.getUri() != triple.predicate) {
                return;
            }
            var resourceForObject;
            if (triple.subject == this.getSubjectUri()) {
                resourceForObject = triple.object;
                this.toggleDirection(true);
            } else if (triple.object.isUri() && triple.object == this.getSubjectUri()) {
                this.toggleDirection(false);
                resourceForObject = triple.subject;
            } else {
                return;
            }
            var object = this.getObjectLocation(resourceForObject);
            object.setObject(resourceForObject);
        },
        triples: function() {
            var triples = new Triples();
            if (this.getLabel() !== undefined) {
                triples.add(this.getLabel().triples());
            }
            _.each(this.getObjects(), function(object) {
                triples.add(object.triples());
            });
            return triples;
        },

        // Set up the widget
        _create : function() {
            this.element.addClass('notepad-predicate');
            if (this.options.initialTriple) {
                this.setUri(this.options.initialTriple.predicate);
                this.add(this.options.initialTriple);
            } else {
                var uri = this.getUri() || "rdfs:member";
                this.setUri(uri);
            }

        },
        _destroy : function() {
            this.element.removeClass("notepad-predicate").removeAttr('contenteditable');
        }
    });

}(jQuery));
