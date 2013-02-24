(function($, undefined) {

    $.widget("notepad.label", {

        // manages a literal or a uri
        // displays the label for a URI
        // can set the URI

        options: { 
            defaultTemplate: '' +
                        '{{#rdfs:label}}' +
                            '{{#rdf:XMLLiteral}}' +
                                '<div contenteditable="true">{{{rdf:XMLLiteral}}}</div>' +
                            '{{/rdf:XMLLiteral}}' +
                            '{{^rdf:XMLLiteral}}' +
                                '<div contenteditable="true" rel="rdfs:label">{{xsd:string}}</div>' +
                            '{{/rdf:XMLLiteral}}' +
                        '{{/rdfs:label}}' +
                        '{{^rdfs:label}}' +
                            '{{#uri}}' +
                                '<div about="{{{uri}}}" class="notepad-label"></div>' +
                            '{{/uri}}' +
                            '{{^uri}}' +
                                '{{#about}}' +
                                    '<span class="uri"><a href="{{{about}}}">{{{about}}}</a></span>' +
                                '{{/about}}' +
                                '{{^about}}' +
                                    '<div contenteditable="true" rel="rdfs:label"></div>' +
                                '{{/about}}' +
                            '{{/uri}}' +
                        '{{/rdfs:label}}' +
                        '',
                                
            uriAttr:            'about',
            uriElement:         undefined,
            autocomplete:       true,
            allowBlankNodes:    true,
            dynamicTemplate:    true,
        },
        _setOption: function(key, value) {
            this._super(key, value);
            switch (key) {
                case 'uriElement':
                    if (value) {
                        this.load();
                    }
                    break;
                case 'defaultTemplate':
                    this.template = value;
                break;
            }
        },

        getEndpoint: function () {
            return this.element.findEndpoint();
        },
        getNotepad: function() {
            return this.element.parents('.notepad').data("notepadNotepad");
        },

        // Object or Literal
        isLiteral: function() {
            return (this.getUri() === undefined && this.getLiteral() !== undefined && this.getLiteral().length > 0);
        },
        isUri: function() {
            return (this.getUri() !== undefined);
        },
        getUri: function() {
            return this.getUriElement().attr(this.options.uriAttr);
        },
        getUriSparql: function() {
            return new Resource(this.getUri()).toSparqlString();
        },
        getUriElement: function() {
            if (this.options.uriElement) { return this.options.uriElement; }
            return this.element;
        },
        setUri: function(uri) {
            if (uri === undefined) {
                throw new Error("cannot set uri to undefined");
            }
            if (uri == this.getUri()) {
                return;
            }
            this._setUri(uri);
            this.uriChanged();

            // Trigger the event only after the label has displayed itself
            // so that: dependent DOM elements can avoid redisplaying a triple that is already displayed here

            // this._trigger("urichange"); // will trigger 'labelurichange'

            // Does this get captured by parent elements of this one, when this is triggered by a child.
            // It should *not* propagate to parents

            this.element.trigger("labelurichange"); // does not add widget prefix.
        },
        _setUri: function(uri) {
            this.getUriElement().attr(this.options.uriAttr, uri);
            return this;
        },
        _unsetUri: function() {
            this.getUriElement().removeAttr(this.options.uriAttr);
        },
        newUri: function() {
            this._setUri($.notepad.getNewUri());
        },
        ensureUri: function() {
            if (this.getUri() !== undefined) { return this.getUri(); }
            this._setUri($.notepad.getNewUri());
        },
        _createTemplateElement: function() {
            return $('<div class="notepad-template">').appendTo(this.element);
        },
        getTemplateElement: function() {
            var el = this.element.children(".notepad-template");
            if (el.length > 0) {
                return el;
            }
            return this._createTemplateElement();
        },
        getLabelElement: function() {
            return this.getTemplateElement().children('[rel="rdfs:label"]');
        },
        focus: function() {
            this.getLabelElement().focus();
        },
        getLiteral: function() {
            var text = this.getLabelElement().text() || this.element.text();
            return (text.length !== 0) ? text : undefined;
        },
        getLiteralAsTriple: function() {
            return toTriple(":", "rdfs:label", this.getLiteral());
        },
        updateFromLiteral: function() {
            var triples = new Triples();
            triples.add(this.getLiteralAsTriple());
            this._updateFromRdf(triples);
        },
        setLiteralOld: function(literal) {
            this._unsetUri();
            var triples = new Triples();
            triples.add( toTriple(":", "rdfs:label", literal ) );
            this._updateFromRdf(triples);
        },
        setLiteral: function(literal) {
            var literals = new Triples();
            literals.add(toTriple(':', 'xsd:string', literal));     // probably should generalize to literal.type
            literals.add(toTriple(":", 'rdfs:label', literal));     // Not sure this makes sense anymore
            this._updateFromRdf(literals);

            // Set Literal using predicate ranges
            var predicateUri = this.getPredicateUri() || 'rdfs:label';
            var label = this;
            this.getEndpoint().describe(predicateUri, function(triples) {
                var ranges = triples.triples(undefined, 'rdfs:range', undefined);
                if (ranges.length == 0) {
                    ranges.add(toTriple(':', 'rdfs:range', 'xsd:string'));
                }
                var literals = new Triples();
                _.each(ranges, function(t) {
                    literals.add(toTriple(':', t.object, literal));
                });
                label._updateFromRdf(literals);
            });
        },

        setObject: function(resource) {
            if (resource.isLiteral()) {
                return this.setLiteral(resource);
            } else if (resource.isUri() || (this.options.allowBlankNodes && resource.isBlank())) {
                return this.setUri(resource);
            }
            throw new Error("cannot set an object that is neither a literal or a URI");
        },
        uriChanged: function(callback) {
            if (this.getEndpoint() === undefined) {
                return;
            }
            var label = this;
            if (this.options.dynamicTemplate) {
                var templateQuery = new Query($.notepad.templates.templates);
                templateQuery.execute(this.getEndpoint(), {uri: this.getUriSparql()}, function(templateTriples) {
                    label.templateReceived(templateTriples, callback);
                });
            } else {
                var template = new Template(this.options.defaultTemplate);
                var dataQuery = $.notepad.queryFromPredicates(template.predicates());
                dataQuery.execute(this.getEndpoint(), {about: this.getUriSparql()}, function(dataTriples) {
                    label.dataReceived(dataTriples, callback);
                });
            }
        },
        templateReceived: function(templateTriples, callback) {
            var templateStrings = templateTriples.triples(this.getUri(), "notepad:template", undefined).objects();
            var templateString;
            if (templateStrings.length === 0) {
                templateString = this.options.defaultTemplate;
            } else {
                templateString = templateStrings[0].toString();
            }

            this.template = templateString;     // for use in updateFromTriples
            var template = new Template(templateString);
            var dataQuery = $.notepad.queryFromPredicates(template.predicates());
            var label = this;
            dataQuery.execute(this.getEndpoint(), {about: this.getUriSparql()}, function(dataTriples) {
                label.dataReceived(dataTriples, callback);
            });
        },
        dataReceived: function(triples, callback) {
            this._updateFromRdf(triples);

            if (this.getNotepad()) {
                this.getNotepad().loaded(triples);  // Assumes all triples loaded where displayed
            }
            if (callback !== undefined) {
                callback.apply(this);
            }    
        },

        load: function(callback) {
            this.uriChanged(callback);
        },
        _updateFromRdf: function(triples) {
            var context = {};
            if (this.getUri()) {
                context['about'] = this.getUri();
            }
            var html = new Template(this.template).render(triples, context);

            this.getTemplateElement().empty();
            this.getTemplateElement().append(html);

            // Apply any widget constructors
            this.getTemplateElement().find(".notepad-label").label({dynamicTemplate: true});

            // This could be done via widget constructors as wel
            this._setupAutocomplete();
        },

        set: function(triple) {
            this._setUri(triple.subject);
            var triples = new Triples();
            triples.push(triple);
            this._updateFromRdf(triples);
        },
        setText: function(text) {
            if (this.isUri()) {
                this.set(toTriple(this.getUri(), "rdfs:label", text));
            } else {
                this.setLiteral(text);
            }
        },

        getPredicate: function() {
            var objectElement = this.getUriElement();
            return objectElement.parent().closest(":notepad-predicate").data('notepadPredicate');
        },
        getPredicateUri: function() {
            var predicate = this.getPredicate();
            return predicate ? predicate.getUri() : undefined;
        },
        getSubjectUri: function() {
            var predicate = this.getPredicate();
            return predicate ? predicate.getSubjectUri() : undefined;
        },
        getResource: function() {
            if (this.isLiteral()) {
                return this.getLiteral();
            } else if ( this.isUri() ) {
                return this.getUri();
            }
            return undefined;
        },
        _getLabelLiteral: function() {
            return this.getLabelElement().text();
        },
        triple: function() {
            if (this.options.uriElement) {
                // if this label is describing a predicate, then it should not return the triple (the object, who knows whether it is defined, should return it instead)
                return undefined;
            }

            var subject, predicate, object;

            if (! (predicate = this.getPredicateUri())) {
                return undefined;
            }
            if (! (subject = this.getSubjectUri())) {
                throw "cannot find a subject URI but can find a predicate URI (ie. inconsistent state)";
            }
            if (! (object = this.getResource())) {
                return undefined;
            }
            var operation = this.getPredicate().getOperation();

            if (this.getPredicate().isForward()) {
                return new Triple(subject, predicate, object, operation);
            }
            // Backward
            if (this.isUri()) {
                return new Triple(object, predicate, subject, operation);
            }
            return undefined;
        },
        labelTriple: function() {
            var uri = this.getUri();
            var label = this._getLabelLiteral();
            if (!uri || !label) {
                return undefined;
            }

            // must return any other triples fetched by the label
            // return this.getTemplateElement().find("[rel]").map(function(i,e) {
            //     return new Triple(uri, $(e).attr('rel'), $(e).text());
            // });
            
            return new Triple(uri, "rdfs:label", label);
        },
        labelTriples: function() {
            // Triples fetched by the label
            if (!this.isUri()) {
                return [];
            }
            var uri = this.getUri();
            var triples = new Triples();
            this.getTemplateElement().children(".notepad-label").each(function(i,e) {
                triples.add($(e).data('notepad-label').labelTriples());
            });

            this.getTemplateElement().children("[rel]").each(function(i,e) {
                var object;

                if ($(e).attr('about')) {
                    object = $(e).attr('about');
                } else {
                    object = $(e).text();
                }
                if (object.length === 0) {
                    return;
                }
                triples.add(new Triple(uri, $(e).attr('rel'), object) );
            });
            return triples;
        },
        childTriples: function() {
            var container = this.element.find(":notepad-container:eq(0)").data('notepadContainer');
                // Must use find instead of children because toggleChildren moves the <ul> element inside a div

            if (!container) {
                return [];
            }
            return container.triples();
        },
        triples: function() {
            var triples = new Triples();
            triples.add(this.triple());
            triples.add(this.labelTriple());
            triples.add(this.labelTriples());
            triples.add(this.childTriples());
            return triples;
        },
        triplesInDomPath: function() {
            var triples = new Triples();
            triples.add(this.triple());
            triples.add(this.labelTriple());
            var parentNode = this.element.parent().closest(":notepad-label");
            if (parentNode.length) {
                triples.add(parentNode.data('notepad-label').triplesInDomPath());
            }
            return triples;
        },
        _setupAutocomplete: function() {
            if (!this.options.autocomplete) {
                return;
            }
            var label = this;
            this.getLabelElement().autocomplete({
                source: function(term,callback) {
                    label.getEndpoint().getSubjectsLabelsByLabel(term.term.trim(),callback);
                },
                select: function(event, ui) {
                    var label = $(event.target).closest('.notepad-label').data('notepadLabel');
                    var uri = ui.item.value;
                    var choice = new Triples();
                    choice.push(toTriple(uri, "rdfs:label", ui.item.label));        // TODO: consider this.set() instead

                    var line = label.element.parents(":notepad-line").data('notepadLine');
                    if (line) {
                        var showChildren = (line.getContainer().getDepth() === 0);
                        line.showChildren(showChildren);
                    }

                    label.setUri(uri);
                    label._updateFromRdf(choice);
                    event.preventDefault();  // prevent the default behaviour of replacing the text with the value.  _updateRdf has taken care of it
                }
            });
        },

        // Set up the widget
        _create: function() {
            // Object
            this.element.addClass('notepad-label');
            this.template = this.options.defaultTemplate;

            if (this.getUri() !== undefined && this.getLiteral() === undefined) {
                // A uri but no literal:
                this.uriChanged();
            } else {
                this.updateFromLiteral();
            }

            // on change, set the URI if it's not yet set
            // => new objects that are not changed do not receive a URI
            // var label = this;
            // this.element.change(function(event) {
            //     if (label.getUri() === undefined) {
            //         label._setUri($.notepad.getNewUri());
            //     }
            // });

            this._setupAutocomplete();
        },
        detach: function() {
            if (this.getNotepad()) {
                this.getNotepad().unloaded(this.labelTriples());
                this.getNotepad().unloaded(this.childTriples());
            }
            this.element.remove();
        },
        _destroy : function() {
            this.element.removeClass("notepad-label");
            this.getLabelElement().autocomplete('destroy');
        },

    });

}(jQuery));
