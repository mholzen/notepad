(function($, undefined) {

    $.widget("notepad.label", {

        options: { 
            template:           '<div contenteditable="true" rel="rdfs:label">' +
                                    '{{{rdfs:label}}}' + 
                                    '{{^rdfs:label}}<span contenteditable="false" class="uri">{{{uri}}}</span>{{/rdfs:label}}' +
                                '</div>',
                                
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
        ensureUri: function() {
            if (this.getUri() !== undefined) { return this.getUri(); }
            this._setUri($.notepad.getNewUri());
        },
        getLabelElement: function() {
            return this.element.children('[rel="rdfs:label"]');
        },
        focus: function() {
            this.getLabelElement().focus();
        },
        getLiteral: function() {
            var text = this.getLabelElement().text() || this.element.text();
            return (text.length !== 0) ? text : undefined;
            // return this.element.contents().filter(function(){ return(this.nodeType == 3); }).text();        // Get only the direct children that are text nodes
            // return literalElement.length > 0 ? literalElement : this._createLiteral();
            //return this.element.text();
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
            this.element.text(literal);
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

        load: function() {
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
            });
        },
        _updateFromRdf: function(triples) {

            // WHEN A label triple is already displayed ... somewhere else on the page, this label does not know about it and still displays the triple

            var predicatesInTemplate = this.getPredicatesInTemplate();

            var context = { uri: this.getUri() };

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
            var html = Mustache.render(this.template(), context);
            this.getLabelElement().remove();  // we need to setup autocomplete again later.
            this.element.prepend(html);
            this._setupAutocomplete();
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
                // reason?
                return undefined;
            }

            var subject, predicate, object;

            if (! (predicate = this.getPredicateUri())) {
                return undefined;
            }

            if (! (subject   = this.getSubjectUri())) {
                throw "cannot find a subject URI but can find a predicate URI";
                //return undefined;
            }
            if (! (object    = this.getResource())) {
                return undefined;
            }
            if (this.getPredicate().isForward()) {
                return new Triple(subject, predicate, object);
            }
            // Backward
            if (this.isUri()) {
                return new Triple(object, predicate, subject);
            }
            return undefined;
        },
        getLabelElement: function() {
            return this.element.children('[rel="rdfs:label"]');
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
            
            return new Triple(uri, "rdfs:label", label);
        },
        childTriples: function() {
            var container = this.element.children(":notepad-container").data('container');
            if (!container) {
                return [];
            }
            return container.triples();

        },
        triples: function() {
            var triples = new Triples(0);
            triples.add(this.triple());
            if (this.isUri()) {
                triples.add(this.labelTriple());  // this could be derived from the template (though label triple is still used in setting the URI)
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
                    var choice = new Triples(0);
                    choice.push(new Triple(uri, "rdfs:label", ui.item.label));

                    label.setUri(uri);
                    label._updateFromRdf(choice);

                    event.preventDefault();  // prevent the default behaviour of replacing the text with the value
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
            this.element.removeClass("notepad-label").removeAttr('contenteditable');
            this.element.autocomplete('destroy');
        },

    });

}(jQuery));
