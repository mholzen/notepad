(function($, undefined) {

    FORWARD = 'forward';
    BACKWARD = 'backward';

    getAttrName = $.fn.getAttrName = function(direction) {
        return ( direction === undefined || direction === FORWARD ? "rel" : "rev" );
    }

    function direction(triples) {
        var inverseCount = triples.triples(undefined, 'inst:inverseLabel').length;
        var forwardCount  = triples.triples(undefined, 'rdfs:label').length;

        if (inverseCount && forwardCount) {
            console.warn("ambiguous direction, assuming forward, given triples:", triples);
            return 'forward';
        }
        if (forwardCount) {
            return 'forward';
        }
        if (inverseCount) {
            return 'backward';
        }
        console.warn("no direction, assuming forward, given triples:", triples);
        return 'forward';
    }

    var labelTemplates = {
        forward: 
            '{{#rdfs:label}}' +
                '<div class="notepad-literal notepad-predicate" rel="rdfs:label">{{xsd:string}}</div>' +
            '{{/rdfs:label}}' +
            '{{^rdfs:label}}' +
                '{{#inst:inverseLabel}}' +
                    // Forward context, no forward label but an inverse one: compute the inverse (defaults to 'related to')
                    '<span class="tooltip notepad-session">' +
                        '<div class="item notepad-literal" rel="rdfs:label">'+
                            '<img src="./external/images/glyphicons/glyphicons_210_left_arrow.png"/>' +
                            '{{xsd:string}}' +
                        '</div>' +

                        '<span class="content">' +
                            '<div class="context">read as:</div>' +
                            '<div class="notepad-reverse-line"/>' +
                        '</span>' +

                    '</span>' +
                '{{/inst:inverseLabel}}' +
                '{{^inst:inverseLabel}}' +
                    '<div class="item notepad-literal" rel="rdfs:label">related to</div>' +
                '{{/inst:inverseLabel}}' +
            '{{/rdfs:label}}' +
            '',
        backward: 
            '{{#inst:inverseLabel}}' +
                '<div class="notepad-literal notepad-predicate" rel="inst:inverseLabel">{{xsd:string}}</div>' +
            '{{/inst:inverseLabel}}' +
            '{{^inst:inverseLabel}}' +
                '{{#rdfs:label}}' +
                    // Inverse context, no inverse label but a forward one: compute the inverse (defaults to 'related to')
                    '<span class="tooltip notepad-session">' +
                        '<div class="item notepad-literal" rel="inst:inverseLabel">'+
                            '<img src="./external/images/glyphicons/glyphicons_210_left_arrow.png"/>' +
                            '{{xsd:string}}' +
                        '</div>' +

                        '<span class="content">' +
                            '<div class="context">read as:</div>' +
                            '<div class="notepad-reverse-line"/>' +
                        '</span>' +
                    '</span>' +
                '{{/rdfs:label}}' +
                '{{^rdfs:label}}' +
                    '<div class="item notepad-literal" rel="inst:inverseLabel">related to</div>' +
                '{{/rdfs:label}}' +
            '{{/inst:inverseLabel}}' +
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
        getDirection: function() {
             if (this.element.attr('rel')) {
                return FORWARD;
            } else if (this.element.attr('rev')) {
                return BACKWARD;
            }
            return undefined;
        },
        isForward: function() {
            return this.getDirection() === FORWARD;
        },
        isBackward: function() {
            return this.getDirection() === BACKWARD;
        },

        _setDirection: function(direction) {
            if (direction === FORWARD || direction === undefined) {
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
            }
        },
        setDirection: function(direction) {
            this._setDirection(direction);
            if (this.hasLabel()) {
                this.getLabel().option('template', labelTemplates[direction]);    
            }
        },
        toggleDirection: function() {
            if (this.isForward()) {
                this.setDirection(BACKWARD);
            } else {
                this.setDirection(FORWARD);
            }
        },
        _setUri: function(uri) {
            this.element.attr(this.getAttribute(), uri);
        },
        setUri: function(uri) {
            this._setUri(uri);
            this._trigger('urichange');

            if (this.hasLabel()) {
                this.getLabel().setUri(uri);    
            }
            // consider: rdfs:range might affect the object's widget
        },
        newUri: function() {
            var uri = $.notepad.newUri();
            this._setUri(uri);
            this._setDirection(FORWARD);
            this._trigger('urichange');

            if (this.hasLabel()) {
                this.getLabel().newUri(uri);
            }
        },

        setUriDirection: function(uri, direction) {
            this._setUri(uri);
            this.setDirection(direction);
            this._trigger('urichange');

            if (this.hasLabel()) {
                this.getLabel().setUri(uri);
            }
        },
        getUri: function() {
            var value = this.element.attr(this.getAttribute());
            if (!value) {
                return undefined;
            }
            return toResource(value);
        },
        hasLabel: function() {
            return this.element.siblings(".notepad-predicate-label").length != 0;
        },
        _labelElement: function() {
            var element = this.element.siblings(".notepad-predicate-label");
            if ( !element.length ) {
                element = $('<div class="notepad-predicate-label">').insertBefore(this.element);
            }
            return element;
        },
        toString: function() {
            return this.getUri().toString();
        },
        _createLabel: function() {
            var element = this._labelElement();
            var predicate = this;
            element.urilabel({
                query: $.notepad.queries.describe_predicate,
                template: labelTemplates[this.getDirection()],
            });
            var label = element.data('notepadUrilabel');

            // selection of the autocomplete menu should
            // set the direction (to: set the template), before: updating selection
            element.on('autocomplete2select', ':notepad-autocomplete2', function(event, ui) {
                var triples = ui.item.value;
                predicate.setDirection(direction(triples));
                    // to: change the labelTemplates
            });

            element.on('urilabelurichange', function(event) {
                var urilabel = $(event.target).data('notepadUrilabel');
                var uri = urilabel.getUri();
                predicate._setUri(urilabel.getUri());
                predicate._trigger('urichange');

            });

            label.setUri(predicate.getUri());
            return label;
        },
        // consider moving the predicate label to line
            // 1-recreate label in line
                // direction change -> event
            // 2-disable _createLabel
        getLabel: function() {
            var label = this._labelElement().data('notepadUrilabel');
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
                        var obj = $(this).data(predicate.options.objectNamespace);
                        if (obj && obj.getObject() == undefined) {
                            // Include objects with an "undefined" uri
                            return true;
                        }
                        if (obj && obj.uri().getUri() == object) {
                            return true;
                        }
                        return $(this).attr('about') == object;
                    });
                } else if (object.isLiteral()) {
                    objects = objects.filter(function() {
                        var obj = $(this).data(predicate.options.objectNamespace);
                        if (obj && obj.getObject() == undefined) {
                            // Include objects with an "undefined" literal
                            return true;
                        }
                        if (obj && obj.literal().getLiteral() == object) {
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
            if (!this.getUri().equals(triple.predicate)) {
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
            if (this.hasLabel()) {
                this.getLabel().uriChanged();    
            }

            var object = this.getObjectLocation(resourceForObject);
            object.setObject(resourceForObject);
        },
        update: function(triple) {
            this.element.empty();
            // consider: remove 'content' attribute on this.element if present

            // consider: refactor getObjects to use findObjects to replace this with getObjects
            // this.element.findObjects().forEach( function(object) {
            //     console.error("this removes the predicate location as well");
            //     object.element.remove();
            // });

            return this.add(triple);
        },
        triples: function() {
            var triples = new Triples();
            if (this.hasLabel()) {
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
                this._setUri(uri);
                    // ask: should creating a new widget trigger urichange event at creation?
                    // favor: no, to avoid the function passed as option to be triggered immediately
            }
        },
        _destroy : function() {
            //this.element.off('predicateurichange');
            if (this.hasLabel()) {
                // Don't mark the predicate labels for deletion
                this.element.closestSession().unload(this.getLabel().triples);
            }
            this.element.removeClass("notepad-predicate").removeAttr('contenteditable');
        }
    });

}(jQuery));
