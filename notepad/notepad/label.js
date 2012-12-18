(function($, undefined) {

    $.widget("notepad.label", {

        // manages a literal or a uri
        // displays the label for a URI
        // can set the URI
            // => 


        options: { 
            template:   '{{#rdfs:label}}' +
                            '<div contenteditable="true" rel="rdfs:label">{{rdfs:label}}</div>' +
                        '{{/rdfs:label}}' +
                        '{{^rdfs:label}}' +
                            '{{#nmo:sender}}<span contenteditable="true" rel="nmo:sender">{{nmo:sender}}</span>{{/nmo:sender}}' +
                            '{{#nmo:messageSubject}}<span class="notepad-column-0" rel="nmo:messageSubject">{{{nmo:messageSubject}}}</span>{{/nmo:messageSubject}}' +
                            '{{^nmo:messageSubject}}' +
                                '{{#uri}}' +
                                    '<div class="uri">{{{uri}}}</div>' +
                                '{{/uri}}' +
                                '{{^uri}}' +
                                    '<div contenteditable="true" rel="rdfs:label"></div>' +
                                '{{/uri}}' +
                            '{{/nmo:messageSubject}}' +
                            '{{#nmo:receivedDate}}<span rel="nmo:receivedDate" class="notepad-column-1">{{nmo:receivedDate}}</span>{{/nmo:receivedDate}}' +
                        '{{/rdfs:label}}' +
                        '',
                                
            uriAttr:            'about',
            uriElement:         undefined,
            autocomplete:       true,
            allowBlankNodes:    true
        },
        _setOption: function(key, value) {
            this._super(key, value);
            switch (key) {
                case 'uriElement':
                if (value) {
                    this.load();
                }
                break;
            }
        },

        getEndpoint: function () {
            return this.element.findEndpoint();
        },
        getNotepad: function() {
            return this.element.parents('.notepad').data("notepad");
        },

        template: function() {
            // The object should be responsible for determining the best way to display itself, given its context

            // if (this.getParent() && this.getParent().lineTemplate) {
            //     return this.getParent().lineTemplate;
            // }

            return this.options.template;
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
            this.load();

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
            var triples = new Triples(0);
            triples.add(this.getLiteralAsTriple());
            this._updateFromRdf(triples);
        },
        setLiteral: function(literal) {
            var triples = new Triples(0);
            triples.add( toTriple(":", "rdfs:label", literal ) );
            this._updateFromRdf(triples);
        },
        setObject: function(resource) {
            if (resource.isLiteral()) {
                return this.setLiteral(resource);
            } else if (resource.isUri() || (this.options.allowBlankNodes && resource.isBlank())) {
                return this.setUri(resource);
            }
            throw new Error("cannot set an object that is neither a literal or a URI");
        },
        getPredicatesInTemplate: function() {
            var variables = this.template().match(/{{[a-zA-Z:]*?}}/gm).map(function(s) {return s.replace(/[\{\}]/g, ''); });
            if (variables.indexOf('uri') != -1) {
                variables.splice(variables.indexOf('uri'), 1);      // Remove the element 'uri'
            }
            return variables;
        },

        queryFromTemplate: function(about) {
            var predicatesInTemplate = this.getPredicatesInTemplate();
            var whereClauses = predicatesInTemplate.map( function(predicate) { return '?s '+predicate+' ?o .'; });
            whereClauses.push (' && .');
            var query = 'CONSTRUCT {?s ?p ?o} WHERE { ?s ?p ?o FILTER( sameTerm(?s, '+about.toSparqlString()+') \
                && ( ?p in (' + predicatesInTemplate.join(",") + ') ) ) }';
            query = query + '\n # query:cache';
            return query;
        },

        load: function(callback) {
            if (! this.isUri()) {
                return;
            }
            // dev:perf
            // When this URI is in our root path, it was already loaded in this context
            // if (this.element.closest('[about='+this.getUri()+']').length > 0) {
            //     // We already have all the triples we care about in this context.  We could just updateFromRdf using ...().triples()
            //     this._updateFromRdf ( this.element.closest('[about='+this.getUri()+']').triples() );
            // }

            if (this.element.findEndpoint() === undefined) {
                // This element could be detached
                return;
            }
            // TODO: refactor with container.load
            var query = this.options.query;
            var sparql;
            var aboutResource = new Resource(this.getUri());    
            if (aboutResource.isBlank()) {
                // We'll never learn anything from blank nodes (is that really true?  what about any local endpoints?)
                return;
            }
            if (query !== undefined) {
                sparql = Mustache.render(query, {about: aboutResource.toSparqlString()});
            } else {
                sparql = this.queryFromTemplate(aboutResource);
            }

            var label = this;
            log.debug("query for label of ", aboutResource.toString());
            this.getEndpoint().execute(sparql, function(triples) {
                label._updateFromRdf(triples);

                if (label.getNotepad()) {
                    label.getNotepad().loaded(triples);  // Assumes all triples loaded where displayed
                }

                if (callback !== undefined) {
                    callback.apply(label);
                }
            });
        },

        _getContextFromTriples: function(triples) {
            var context = { uri: this.getUri() };
            if (!triples) {
                return context;
            }

            var predicatesInTemplate = this.getPredicatesInTemplate();

            var label = this;
            _.each(predicatesInTemplate, function(predicate) {
                var values = triples.filter(function(triple) { return triple.predicate == predicate; });
                if (values.length == 0) {
                    // log.debug("cannot find a value for "+predicate+" in template substitution");
                    return;
                }
                if (values.length > 1) {
                    log.warn("cannot find exactly 1 value ("+values.length+" found) for "+predicate+" in template substitution");
                    log.warn("using first ("+values[0].object+")");
                }
                context[predicate] = values[0].object;
            });
            return context;
        },

        _updateFromRdf: function(triples) {
            // WHEN A label triple is already displayed ... somewhere else on the page, this label does not know about it and still displays the triple

            var context = this._getContextFromTriples(triples);
            var html = Mustache.render(this.template(), context);

            this.getTemplateElement().empty();
            this.getTemplateElement().append(html);

            // this.getLabelElement().remove();  // we need to setup autocomplete again later.
            // this.element.prepend(html);
            this._setupAutocomplete();
        },

        set: function(triple) {
            this._setUri(triple.subject);
            var triples = new Triples();
            triples.push(triple);
            this._updateFromRdf(triples);
        },

        getPredicate: function() {
            var objectElement = this.getUriElement();
            return objectElement.parent().closest(":notepad-predicate").data('predicate');
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
        _getLabelLiteral: function() {
            return this.getLabelElement().text();
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
        childTriples: function() {
            var container = this.element.find(":notepad-container:eq(0)").data('container');
                // Must use find instead of children because toggleChildren moves the <ul> element inside a div

            if (!container) {
                return [];
            }
            return container.triples();

        },
        triples: function() {
            var triples = new Triples(0);
            triples.add(this.triple());
            if (this.isUri()) {
                var uri = this.getUri();
                // must return any other triples fetched by the label
                this.getTemplateElement().find("[rel]").each(function(i,e) {
                    var object = $(e).text();
                    if (object.length === 0) {
                        return;
                    }
                    triples.add(new Triple(uri, $(e).attr('rel'), object) );
                });
            }
            $.merge(triples, this.childTriples());
            return triples;
        },
        _setupAutocomplete: function() {
            if (!this.options.autocomplete) {
                return;
            }
            var label = this;
            this.getLabelElement().autocomplete({
                source: function(term,callback) {
                    label.getEndpoint().getSubjectsLabelsByLabel(term.term,callback);
                },
                select: function(event, ui) {
                    var label = $(event.target).closest('.notepad-label').data('label');
                    var uri = ui.item.value;
                    var choice = new Triples();
                    choice.push(toTriple(uri, "rdfs:label", ui.item.label));        // TODO: consider this.set() instead
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

            if (this.getUri() !== undefined && this.getLiteral() === undefined) {
                // A uri but no literal:
                this.load();
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
        _destroy : function() {
            this.element.removeClass("notepad-label");
            this.getLabelElement().autocomplete('destroy');
        },
        searchByLabelLiteral: function(literal, callback) {
            var query = new Query($.notepad.templates.labels);
            query.appendPattern('?subject rdfs:label "{{{rdfs:label}}}"');
            query.execute(this.getEndpoint(), {'rdfs:label': literal}, callback);
        },


    });

}(jQuery));
