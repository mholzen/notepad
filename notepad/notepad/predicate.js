(function($, undefined) {

    FORWARD = 'forward';
    BACKWARD = 'backward';

    getAttrName = $.fn.getAttrName = function(direction) {
        return ( direction === undefined || direction === FORWARD ? "rel" : "rev" );
    }

    var labelTemplates = {
        forward: 
            '{{#rdfs:label}}' +
                '<div contenteditable="true" rel="rdfs:label">{{xsd:string}}</div>' +
            '{{/rdfs:label}}' +
            '{{^rdfs:label}}' +
                '{{#notepad:inverseLabel}}' +
                    // Forward context, no forward label but an inverse one: compute its inverse (defaults to 'related to')
                    '<span class="tooltip">' +
                        '<div class="item" contenteditable="true" rel="rdfs:label">related to</div>' +
                        '<span class="content">Reverse of: <span class="predicate-label" rel="notepad:inverseLabel">{{xsd:string}}</span></span>' +
                    '</span>' +
                    // '<div class="tooltip" alt="inverse of &quot;{{xsd:string}}&quot;" contenteditable="true" rel="rdfs:label">related to</div>' +
                    //'is <div contenteditable="true" rel="notepad:inverseLabel">{{xsd:string}}</div> of' +
                '{{/notepad:inverseLabel}}' +
                '{{^notepad:inverseLabel}}' +
                    // Forward context, no inverse label, no forward label: default value for a forward relationship')
                    '<span class="tooltip">' +
                        '<div class="item" contenteditable="true" rel="rdfs:label">related to</div>' +
                        '<span class="content">No known labels</span>' +
                    '</span>' +                
                '{{/notepad:inverseLabel}}' +
            '{{/rdfs:label}}' +
            '',
        backward: 
            '{{#notepad:inverseLabel}}' +
                '<div contenteditable="true" rel="notepad:inverseLabel">{{xsd:string}}</div>' +
            '{{/notepad:inverseLabel}}' +
            '{{^notepad:inverseLabel}}' +
                '{{#rdfs:label}}' +
                    // Inverse context, no inverse label but a forward one: compute the inverse (defaults to 'related to')
                    '<span class="tooltip">' +
                        '<div class="item" contenteditable="true" rel="notepad:inverseLabel">related to</div>' +
                        '<span class="content">Reverse of: <span class="predicate-label" rel="rdfs:label">{{xsd:string}}</span></span>' +
                    '</span>' +
                    // '<div class="tooltip" alt="inverse of &quot;{{xsd:string}}&quot;" contenteditable="true" rel="notepad:inverseLabel">related to</div>' +
                    //'is <div contenteditable="true" rel="rdfs:label">{{xsd:string}}</div> of' +
                '{{/rdfs:label}}' +
                '{{^rdfs:label}}' +
                    // Inverse context, no inverse label, no forward label: default value for a inverse relationship')
                    '<span class="tooltip">' +
                        '<div class="item" contenteditable="true" rel="notepad:inverseLabel">related to</div>' +
                        '<span class="content">No known labels</span>' +
                    '</span>' +                
                '{{/rdfs:label}}' +
            '{{/notepad:inverseLabel}}' +
            ''
    };

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
            label: "urilabel",
            labelNamespace: "notepadUrilabel",
            allowBlankNodes: true,
            objectNamespace: "notepadObject"
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
            return this.getDirection() === FORWARD;
        },
        getDirection: function() {
             if (this.element.attr('rel')) {
                return FORWARD;
            } else if (this.element.attr('rev')) {
                return BACKWARD;
            }
            return undefined;
        },
        setDirection: function(direction) {
            if (direction === FORWARD) {
                var uri = this.element.attr('rev');
                this.element.attr('rel', uri).removeAttr('rev');
            } else if (direction === BACKWARD) {
                var uri = this.element.attr('rel');
                this.element.attr('rev', uri).removeAttr('rel');

                // Should ensure that all objects are URIs
                _.each(this.getObjects(), function(object) {
                    if (object.isLiteral()) {
                        object.uri();
                    }
                });
            } else {
                throw new Error('unknow direction', direction);
            }
            this.getLabel().option('template', labelTemplates[direction]);
        },
        toggleDirection: function() {
            if (this.isForward()) {
                this.setDirection(BACKWARD);
            } else {
                this.setDirection(FORWARD);
            }
        },
        getOperation: function() {
            return this.element.hasClass('delete') ? "delete" : "update";
        },
        _setUri: function(uri) {
            this.element.attr(this.getAttribute(), uri);
            this._trigger('urichange');
        },
        setUri: function(uri) {
            this._setUri(uri);
            this.getLabel().setUri(uri);
        },
        setUriDirection: function(uri, direction) {
            this._setUri(uri);
            this.setDirection(direction);
            this.getLabel().setUri(uri);
        },
        getUri: function() {
            return this.element.attr(this.getAttribute());
        },
        newUri: function(term) {
            var uri = $.notepad.getNewUri();
            this._setUri(uri);
            this.setDirection(FORWARD);
            this.getLabel().newUri(uri, term);
        },
        _createLabel: function() {
            var element = $('<div class="notepad-predicate-label">').prependTo(this.element);
            var predicate = this;
            $(element)[this.options.label] ({
                template: labelTemplates[this.getDirection()],

                // Taken care of via autocompleteSelect: only way for the label to change the predicate URI
                // urichange: function() {
                //     var label = $(this).data(predicate.options.labelNamespace);
                //     predicate.setUri(label.getUri());
                // },
                autocompleteSource: function(request,callback) {
                    var urilabel = this.element.closest(':notepad-urilabel').data('notepadUrilabel');
                    var query = new Query($.notepad.templates.find_predicate_label_by_label);

                    query.execute(urilabel.getEndpoint(), {'rdfs:label': request.term.trim()}, function(triples) {
                        console.log(triples.toPrettyString());
                        callback(triples.map(function(triple) {
                            return {label: triple.object, value: triple};
                        }));
                    });
                },
                autocompleteSelect: function(event, ui) {
                    var triple = ui.item.value;
                    var urilabel = $(event.target).closest(':notepad-urilabel').data('notepadUrilabel');

                    // This code execute as a of setting the urilabel triple
                    // which implies that it's not just the URI that affects the predicate, it's also its label
                    var direction = triple.predicate == 'rdfs:label' ? FORWARD : BACKWARD;
                    predicate.setUriDirection(triple.subject, direction);
                    urilabel.set(triple);
                    predicate.getObjects()[0].focus();

                    event.preventDefault();  // prevent the default behaviour of replacing the text with the value.  _updateRdf has taken care of it
                },
            });
            var label = $(element).data(this.options.labelNamespace);
            label.setUri(predicate.getUri());
            // this.element.on('predicateurichange', function() {
            //     label.setUri(predicate.getUri());  // may or may not trigger label.load()
            // });
            return element.data(this.options.labelNamespace);
        },
        getLabel: function() {
            var label = this.element.children('.notepad-predicate-label').data(this.options.labelNamespace);
            if (!label) {
                label = this._createLabel();
            }
            return label;
        },
        getObjects: function(object) {
            var objects = this.element.children('.notepad-object3').filter(function() { return !$(this).hasClass('notepad-predicate-label');});
            var predicate = this;
            if (object) {
                if (object.isUri() || (this.options.allowBlankNodes && object.isBlank())) {
                    objects = objects.filter(function() {
                        var label = $(this).data(predicate.options.objectNamespace);
                        if (label && label.getObject() == undefined) {
                            // Include objects with an "undefined" uri
                            return true;
                        }
                        if (label && label.getUri() == object) {
                            return true;
                        }
                        return $(this).attr('about') == object;
                    });
                } else if (object.isLiteral()) {
                    objects = objects.filter(function() {
                        var label = $(this).data(predicate.options.objectNamespace);
                        if (label && label.getObject() == undefined) {
                            // Include objects with an "undefined" literal
                            return true;
                        }
                        if (label && label.getLiteral() == object) {
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
            var predicate = this;
            return objects.map(function(i,e) { return $(e).data(predicate.options.objectNamespace); });
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
            return $('<div class="notepad-object3">').appendTo(this.element).object().data(this.options.objectNamespace);
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
                this.setDirection(FORWARD);
            } else if (triple.object.isUri() && triple.object == this.getSubjectUri()) {
                this.setDirection(BACKWARD);
                resourceForObject = triple.subject;
            } else {
                return;
            }
            this.getLabel().uriChanged();
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
        _create: function() {
            this.element.addClass('notepad-predicate');
            if (this.options.initialTriple) {
                this.setUri(this.options.initialTriple.predicate);
                this.add(this.options.initialTriple);
            } else {
                var uri = this.getUri() || "rdfs:member";
                this.setUri(uri);
            }

        },
        detach: function() {
            if (this.getNotepad()) {
                this.getNotepad().unloaded(this.getLabel().triples());
            }
            this.getLabel().element.remove();
            this.getObjects().detach();
        },
        _destroy : function() {
            //this.element.off('predicateurichange');
            this.element.removeClass("notepad-predicate").removeAttr('contenteditable');
        }
    });

}(jQuery));
