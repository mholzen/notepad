(function($, undefined) {

    $.widget("notepad.label", {

        options: { 
            // template: '<div rel="rdfs:label">{{{rdfs:label}}}{{^rdfs:label}}<span contenteditable="false" class="uri">{{{uri}}}</span>{{/rdfs:label}}</div>',
            template:           '<div rel="rdfs:label">{{{rdfs:label}}}</div>',
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
            return (this.getUri() === undefined && this.getLiteral().length > 0);
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
            this._setUri(uri);
            this.load();
        },
        _setUri: function(uri) {
            this.getUriElement().attr(this.options.uriAttr, uri);
            return this;
        },      
        getLiteral: function() {
            return this.element.text();
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
            return query;
        },

        load: function() {
            if (! this.isUri()) {
                return;
            }
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
            this.getEndpoint().execute(sparql, function(triples) {
                label._updateFromRdf(triples);

                // Trigger the event only after the label has displayed itself
                // so that: dependent DOM elements can avoid redisplaying a triple that is already displayed here
                label._trigger("urichange"); // will trigger 'objecturichange'
            });
        },
        _updateFromRdf: function(triples) {

            // WHEN A label triple is already displayed ... somewhere else on the page, this label does not know about it and still displays the triple

            var predicatesInTemplate = this.getPredicatesInTemplate();

            var context = { uri: this.getUri().toString() };

            _.each(predicatesInTemplate, function(predicate) {
                var values = triples.filter(function(triple) { return triple.predicate == predicate; });
                if (values.length == 0) {
                    log.debug("cannot find a value for "+predicate+" in template substitution");
                    return;
                }
                if (values.length > 1) {
                    log.warn("cannot find exactly 1 value ("+values.length+" found) for "+predicate+" in template substitution");
                    log.warn("using first ("+values[0].object+")");
                }
                context[predicate] = values[0].object;
            })
            var html = Mustache.render(this.template(), context);
            this.element.html(html);
        },

        getPredicateElement: function() {
            var objectElement = this.options.uriElement || this.element;
            var predicateElement = objectElement.closest('[rel]');
            if (predicateElement.length > 0 && this.options.uriElement && predicateElement[0] === this.options.uriElement[0]) {
                return undefined;
            }
            return predicateElement;
        },
        getPredicateUri: function() {
            return this.getPredicateElement().attr('rel');
        },
        getSubjectElement: function() {
            var predicateElement = this.getPredicateElement();
            if (predicateElement === undefined) {
                return undefined;
            }
            return this.getPredicateElement().closest('[about]');      // TODO: this should come from notepad-predicate, shouldn't it?
        },
        getSubjectUri: function() {
            var subjectElement = this.getSubjectElement();
            if (subjectElement === undefined) {
                return undefined;
            }
            return subjectElement.attr('about');
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
            var subject = this.getSubjectUri();
            if (!subject) {
                return undefined;
            }
            var predicate = this.getPredicateUri();
            if (!predicate) {
                return undefined;
            }
            var resource = this.getResource();
            if (!resource) {
                return undefined;
            }
            return new Triple(subject, predicate, resource);
        },
        labelTriple: function() {
            if (!this.isUri() || !this.getLiteral()) {
                return undefined;
            }
            return new Triple(this.getUri(), "rdfs:label", this.getLiteral());
        },
        triples: function() {
            var triples = new Triples(0);
            if (this.triple() !== undefined) {
                triples.push(this.triple());
            }
            if (this.isUri() && this.labelTriple() !== undefined) {
                triples.push(this.labelTriple());
            }
            return triples;
        },
        _setupAutocomplete: function() {
            if (!this.options.autocomplete) {
                return;
            }
            var label = this;
            this.element.autocomplete({
                source: function(term,callback) {
                    label.getEndpoint().getSubjectsLabelsByLabel(term.term,callback);
                },
                select: function(event, ui) {
                    var label = $(event.target).closest('.notepad-label').data('label');
                    var uri = ui.item.value;
                    var choice = new Triples(0);
                    choice.push(new Triple(uri, "rdfs:label", ui.item.label));
                    label._setUri(uri);
                    label._updateFromRdf(choice);
                    event.preventDefault();  // prevent the default behaviour of replacing the text with the value
                }
            });
        },

        // Set up the widget
        _create : function() {
            // Object
            this.element.addClass('notepad-label').attr('contenteditable', 'true');

            if (this.isUri() && this.getLiteral() == "") {
                this.load();
            }

            // on change, set the URI if it's not yet set
            // => new objects that are not changed do not receive a URI
            var label = this;
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
