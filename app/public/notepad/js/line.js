(function($, undefined) {

    $.notepad = $.notepad || {};

    // A line matcher, based on the container uri and the triple
    Selector = $.fn.Selector = function(uri, triple) {
        if (uri == triple.subject) {
            this.direction = FORWARD;
            this.line = triple.object;
        } else if (uri == triple.object) {
            this.direction = BACKWARD;
            this.line = triple.subject;
        } else {
            return undefined;
        }
        this.predicate = triple.predicate;
        return this;
    }

    Selector.prototype = {
        // WARNING:  the jQuery selector obtained via toString() does not have the same effect as the filter obtained using filter().
        // IN patricular, matching the line based on a literal will not produce the same results.
        // I need to fix tests before removing the toString() jquery selector.

        toString: function() {
            var selector = "";
            if (this.predicate) {
                selector = selector + '[' + $.fn.getAttrName(this.direction) + '="' + this.predicate +'"]';
            }
            if (this.line.isUri()) {
                selector = selector + '[about="' + this.line +'"]';
            } else if (this.line.isLiteral()) {
                selector = selector + ':contains(' + this.line +')';   
            }
            return selector;
        },
        filter: function() { 
            var selector = this;
            return function() {
                var matchPredicate = $(this).children(":notepad-predicate[" + $.fn.getAttrName(selector.direction) +'="' + selector.predicate + '"]');
                if (!matchPredicate.length === 0) {
                    return;
                }
                var matchLine;
                if (selector.line.isUri()) {
                    matchLine = ( $(this).find('.notepad-object3[about="' + selector.line + '"]').length !== 0 );
                } else {
                    matchLine = ( $(this).find('.notepad-object3 .value').text() == selector.line );
                }
                return matchLine;
            };
        }

    }

    var DEFAULT_DESCRIBE_DEPTH = 1;     // descend 1 level when describing the object of a line

    $.widget("notepad.line", {

        // See notepad.js for interface

        options : {
            query: "CONSTRUCT { ?s rdfs:label ?label } WHERE { ?s rdfs:label ?label FILTER sameTerm(?s, {{{about}}} ) }",
            // Alternatives are:
            // any property that inherits from rdfs:label
            // a list of triples, not just ?s rdfs:label ?label, such as
            // "CONSTRUCT { ?s rdfs:label ?label } WHERE { ?s rdfs:label ?label FILTER sameTerm(?s, {{{about}}} ) }",
        },

        getEndpoint: function () {
            return this.element.findEndpoint();
        },
        getDirection: function() {
            var forward = this.getPredicate().isForward();
            return forward !== undefined ? (forward ? FORWARD : BACKWARD) :  undefined;
        },
        hasObjectUri: function() {
            return (this.getUri() !== undefined);
        },
        hasObjectLiteral: function() {
            return !this.hasObjectUri();
        },

        // Line Uri
        toUri: function() {
            return this.getObject().uri();
        },
        getUri: function() {
            if (! this.getObject().isUri()) {
                return;
            }
            return this.getObject().uri().getUri();
        },
        _setUri: function(uri) {
            this.element.attr('about',uri);
            return this;
        },      
        setUri: function(uri) {
            this.getChildContainer().unload();
            return this.getObject().uri().setUri(uri);
        },
        load: function() {
            // TODO: refactor with container.load
            var aboutResource = new Resource(this.getUri());
            var sparql = Mustache.render(this.options.query, {about: aboutResource.toSparqlString()});
            var line = this;
            this.getEndpoint().execute(sparql, function(triples) {
                line._updateFromRdf(triples);
            });
        },

        _updateFromRdf: function(triples) {
            var line = this;
            $.each(triples, function(index,triple) {
                if (triple.subject != line.getUri() || triple.predicate != 'rdfs:label') {
                    return;
                }
                line.setLineLiteral(triple.object);
            });
        },

        // Container Membership
        getContainer: function() {
            return this.element.parents('.notepad-container').data("notepadContainer");
        },
        getContainerUri: function() {
            return this.getContainer().getUri();
        },
        _setPredicateUri: function(uri) {
            this.getPredicate().setUri(uri);
        },
        // replace with setPredicate
        setContainerPredicateUri: function(uri, direction) {
            this.getPredicate().setUriDirection(uri, direction);
            this.updatePredicateDisplay();
        },
        setPredicate: function(uri,direction) {
            this.getPredicate().setUriDirection(uri, direction);
            return this.updatePredicateDisplay();
        },
        newPredicateUri: function(term) {
            this.getPredicate().newUri();
            this.getPredicateLabel().setLabel(term);
            this.updatePredicateDisplay();
        },
        getContainerPredicateUri: function() {
            return this.getPredicate().getUri();
        },
        subject: function() {
            if (this.getDirection() === FORWARD) {
                return this.getContainerUri();
            } else if (this.getDirection() === BACKWARD) {
                if (this.getUri() === undefined) {
                    throw new Error("a backward triple requires a URI");
                }
                return this.getUri();
            }
            return undefined;
        },
        isPredicateVisible: function() {
            return this.getPredicate().getLabel().element.is(":visible");
        },
        showPredicate: function() {
            this.getPredicate().getLabel().element.show();
        },
        hidePredicate: function() {
            // do nothing if the element doesn't exit
            if (! this.getPredicate().hasLabel()) {
                return;
            }
            this.getPredicate().getLabel().element.hide();
        },
        _predicateUriSameAsContainer: function() {
            if ( ! this.getContainer() ) {
                return false;
            }
            return this.getPredicate().getUri() == this.getContainer().options.predicate
        },
        updatePredicateDisplay: function() {
            if (this._predicateUriSameAsContainer() && this.getDirection() === FORWARD) {
                this.hidePredicate();
            } else {
                this.showPredicate();
            }
        },
        getObject: function() {
            return this.getPredicate().getObjects()[0];
        },

        setObjectResource: function(resource) {
            this.getObject().setObject(resource);
        },
        getObjectResource: function() {
            return this.getObject().getObject();
        },

        // deprecates: setTriple
        update: function(triple) {
            var lineSelector = new $.fn.Selector(this.getContainerUri(), triple);
            if ( lineSelector.direction === undefined ) {
                console.debug("Triple does not relate to this container");
                return;
            }

            this.setContainerPredicateUri(triple.predicate, lineSelector.direction);

            if ( triple.object.isLiteral() ) {
                return this.setLineLiteral(triple.object);
            }
            return this.setUri(lineSelector.line);
        },

        // deprecated-for: update
        setTriple: function(triple) {
            if (this.getUri() === undefined) {
                if (this.getContainerUri() == triple.subject) {
                    // Forward
                    this.setContainerPredicateUri(triple.predicate, FORWARD);
                    this.setObjectResource(triple.object);
                } else if ( this.getContainerUri() == triple.object ) {
                    // Backward
                    this.setContainerPredicateUri(triple.predicate, BACKWARD);
                    this.setObjectResource(triple.subject);
                }
                return;
            }
            if (triple.subject.equals(this.getUri())) {
                // No need to set the subject
                this.setContainerPredicateUri(triple.predicate, FORWARD);
                this.setObjectResource(triple.object);
                return;
            }
            if (triple.object.equals(this.getUri())) {
                this.setContainerPredicaterUri(triple.predicate, BACKWARD);
                this.setObjectResource(this.subject);
                return;
            }
            this.setSubjectUri(triple.subject)
            this.setContainerPredicateUri(triple.predicate, FORWARD);
            this.setObjectResource(triple.object);
        },

        // warn: usage confusing wiht getLiteral()
        getLineLiteral: function() {
            if (!this.getObject().isLiteral()) {
                return undefined;
            }
            return this.getObject().literal().getLiteral();
        },
        setLineLiteral: function(literal) {
            $("#control").hide().appendTo('body');  // move the control out of the line to remove.  should: refactor
            this.getObject().literal().setLiteral(literal);
            this.showChildren();        // A literal has no children, so this effectively ensures we have a '-' and not a '+'
            return this;
        },
        // Children elements
        getChildList: function() {
            //this.getObject().uri();
            var ul = this.getObject().element.find('ul.child:first');  // use find instead of children because jqueryui can move the element during transitions
            if (ul.length === 0) {
                ul = $('<ul class="child">').appendTo(this.getObject().element); // .sortable();
            }
            return ul;
        },
        _createChildContainer: function() {
            var objectElement = $(this.getObject().element[0]);
            var container = this.getChildList().container({sourceElement: objectElement}).data('notepadContainer');
            var line = this;
            objectElement.on("urilabelurichange", function(event) {
                event.stopPropagation();
                if (event.target != objectElement[0]) {
                    // ignoring event for another target
                    return false;
                }

                container.unload();

                if (line.options.describeDepth === 0) {
                    return;
                }

                if (!line.collapsed()) {
                    container.load();
                }
                return false; // prevent this event from being caught by any labels in the path to root
            });

            //this._createChildToggle();
            this.getChildToggle();

            return container;
        },

        getChildContainer: function() {
            var container = this.getChildList().data('notepadContainer');
            if (!container) {
                container = this._createChildContainer();
            }
            return container;
        },
        getLines: function() {
            return this.getChildContainer().getLines();
        },
        appendChildLine: function(li) {
            this.toUri();
            if (! this.getUri()) {
                throw new Error("cannot determine uri when adding a child line");
            }
            var newLine = this.getChildContainer().appendLine(li);
            this.options.describeDepth = 1;     // adding a new child line should not expand child lines recursively
            this.showChildren();
            return newLine;
        },
        insertLineAfter: function() {
            // When a line has children, it should insert before any child
            if (!this.collapsed() && this.getLines().length > 0) {
                return this.getLines()[0].insertLineBefore();
            }
            var li = $('<li>').insertAfter(this.element).line();
            return li.data('notepadLine');
        },
        insertLineBefore: function() {
            var li = $('<li>').insertBefore(this.element).line();
            return li.data('notepadLine');
        },

        predicateTriples: function() {
            return this.getPredicate().triples();
        },
        childTriples: function() {
            if (this.getChildContainer() === undefined) {
                throw new Error("somehow, we can't find a child container anymore");
            }
            return this.getChildContainer().triples();
        },
        triples: function() {
            var triples = new Triples();
            if ( this.getObject().isLiteral() ||
                 ( this.getObject().isUri() && 
                    (this.getObject().uri().triples().length !== 0 || this.getObject().uri().pending())
                ) )  {

                // only count predicate triples if we've defined something about the URI itself
                triples.add(this.predicateTriples());
            }

            triples.add(this.childTriples());
            return triples;
        },

        focus: function() {
            return this.getObject().focus();
        },
        indent: function() {
            // when the line is top level, then don't move
            var newParentLine = this.element.prev('li');
            if (!newParentLine.length) {
                return false;
            }

            // Move current line to newParent
            return newParentLine.data('notepadLine').appendChildLine(this.element);
        },
        unindent: function(event) {
            // Determine the new location
            var newPredecessor = this.element.parent('ul').closest('li');

            // Prevent moving if we couldn't find the new parent
            if (!newPredecessor.length) {
                return false;
            }

            // Move current line to parent
            return this.element.insertAfter(newPredecessor); 
        },
        getPredicate: function() {
            return this.element.children(":notepad-predicate").data('notepadPredicate');
        },
        getPredicateLabel: function() {
            return this.getPredicate().getLabel();
        },
        getChildToggle: function() {
            var toggle = this.element.children('.childrenToggle:eq(0)');
            if (toggle.length !== 0) {
                return toggle;
            }
            return this._createChildToggle();
        },
        _initiallyCollapsed: function() {
            if (this.options.describeDepth === 0) {
                return true;
            }
            if (this.getContainer() && ! this.getContainer().option('describeElements')) {
                return true;
            }
            return false;
        },
        _createChildToggle: function() {
            // Children collapse/expand
            var childrenToggle = $('<a>').addClass('childrenToggle');
            var line = this;
            childrenToggle.click(function(event) {
                line.option('describeDepth', 1);
                line.childrenToggle();
            });
            this.element.prepend(childrenToggle);

            // Setting the label to a literal (or to nothing) should show '-' (ie no children)
            // When the child container has no elements, show '-'

            // Initial state depends on the container
            if (this._initiallyCollapsed()) {
                this.hideChildren();
            }

            // No need to show because the initial state is: not collapsed, children shown
            // thus avoiding an unnecessarey refresh and reload
            return childrenToggle;
        },
        _createPredicate: function() {
            var line = this;
            var element = $('<div>').appendTo(this.element).predicate({
                urichange: function() {
                    line.updatePredicateDisplay();
                }
            });
            line.updatePredicateDisplay();

            var predicate = element.data('notepadPredicate');

            if (this.options.initialTriple) {
                predicate.setUri(this.options.initialTriple.predicate);
            }
            var object = predicate.ensureOneObject();

            this._createChildContainer();
                // requires the dependant object to be there

            if (this.options.initialTriple) {
                predicate.add(this.options.initialTriple);
                    // should reuse the first object BUT does not
                    // should set the object URI
                    // should trigger load
            }

            // This will cause the object to be created before the child container has been, so the load event fires
            // but the parent container receives it
        },
        _createColumnObjects: function() {
            // For all columns, create objects
            var line = this;
            _.each( this.getContainer().getColumns(), function(column) {
                var objectElement = $('<div>');
                objectElement.addClass(column.getCssClass());
                objectElement.appendTo(this.element);
                objectElement.object();

                var object = objectElement.data('notepadObject');
                object.setPredicate(column);
                object.setSubject(line);
            });
        },
        _ensureSubjectUriExists: function() {

            if(!this.getContainer()) {
                throw new Error("when creating a new line, should find a parent container");
            }
            var enclosingLabel = this.getContainer().element.closest(":notepad-urilabel");
            if (enclosingLabel.length > 0) {
                enclosingLabel.data('notepadUrilabel').ensureUri();
            }
        },
        _getDefaultDescribeDepth: function() {
            var parentLine = this.element.parents(":notepad-line");
            return parentLine.length ? parentLine.data('notepadLine').option('describeDepth') - 1 : DEFAULT_DESCRIBE_DEPTH;
        },
        // Set up the line widget
        _create: function() {

            if (this.options.describeDepth === undefined) {
                this.option('describeDepth', this._getDefaultDescribeDepth());
            }

            // Verify the container

            // this._ensureSubjectUriExists();

            this.element.addClass("notepad-line");      // TODO: change all .notepad-* to :notepad-*
            
            // Save the initial content of the line to later initialize the object with it.
            var objectText = this.element.text();
            this.element.text("");
            
            this._createPredicate();                    // Creates the predicate and the first object
                                                        // Sets the URI, which fails to trigger the child container

            this.getObject().uri();
            
            // this._createColumnObjects();
        },

        getChildrenToggle: function() {
            return this.element.children('.childrenToggle');
        },
        collapsed: function() {
            return this.getChildrenToggle().hasClass('collapsed');
        },
        showChildren: function(showOrHide) {
            if (showOrHide === undefined) { showOrHide = true; }
            this.childrenToggle(!showOrHide);
        },
        hideChildren: function(hideOrShow) {
            if (hideOrShow === undefined) { hideOrShow = true; }
            this.childrenToggle(hideOrShow);
        },
        childrenToggle: function(hide) {
            if (hide === undefined) {
                hide = ! this.collapsed();
            }
            var toggleElement = this.getChildrenToggle();
            if (hide) {  // collapse
                toggleElement.addClass('collapsed');
                this.getChildList().hide();
            } else {  // expand
                toggleElement.removeClass('collapsed');
                this.getChildList().show();
                this.getChildContainer().refresh();
            }
        },
        remove: function() {
            var session = this.element.closestSession();    // to use the session after the element was detached

            this.element.detach();                  // to remove the line-container membership triple

            if (session) {
                session.unloaded(this.triples());   // to unload all other triples
            }

            this.element.remove();                  // to destroy this widget
        },
        delete: function() {
            // All triples, other than predicate labels, will be marked for deletion
            this.element.remove();
        },
        _destroy : function() {
            this.getPredicate().element.remove();
            this.element.removeClass("notepad-line").removeAttr('about');
        },

        addCheckboxToChildLines: function() {
            this.getChildContainer().element.children('li').prepend('<input type="checkbox">');
        },
        getLiteral: function() {
            var object = this.getObject();
            if (object.isLiteral()) {
                return object.literal().getLiteral();
            }
            if (object.isUri()) {
                return object.uri().getLabel();
            }
        },
        discoverPredicate: function() {
            var object = this.getObject();

            if (object.isLiteral()) {
                console.info("ignoring discoverPredicate because the object is a literal");
                return;
            }
            var urilabel = object.uri();

            var objectTriples = urilabel.triples();
            if (objectTriples.length !== 1 && objectTriples[0].predicate != 'rdfs:label') {
                console.info("ignoring discoverPredicate because cannot locate a single label triple in the line");
                return;
            }

            var triple = objectTriples[0];
            var literal = triple.object;

            var parts = $.notepad.discoverPredicate(literal.toString());
            if (!parts) {
                console.info("can't extract parts from ", literal);
                return;
            }
            var predicateTerm = parts.predicate;
            var remainder = parts.remainder;

            var line = this;
            var query = $.notepad.queries.find_predicate_label_by_label;

            query.execute(this.element.findEndpoint(), {'rdfs:label': '^' + predicateTerm + '$' }, function(triples) {

                line.showPredicate();

                urilabel.setLabel(remainder);
                var predicateLabel = line.getPredicateLabel();

                if (triples.length === 0) {
                    console.info("line.discoverPredicate", 'no predicate labels found matching "', predicateTerm, '"');
                    line.newPredicateUri(predicateTerm);

                    urilabel.getLabelElement().focus();
                    return;
                }
                if (triples.length > 0) {
                    var triple = triples[0];
                    var direction = triple.predicate == 'rdfs:label' ? FORWARD : BACKWARD;
                    line.getPredicate().setUriDirection(triple.subject, direction);
                    predicateLabel.setLabel(triple.object);

                    if (triples.length > 1) {
                        predicateLabel.element.addClass('ambiguous');
                    }
                    
                    urilabel.getLabelElement().focus();
                    return;
                }
            });
        },
        discoverSparql: function() {
            if (! this.getObject().isLiteral() ) {
                return; // consider: converting a URI into a literal
            }
            // if literal is sparql
            var literal = this.getObject().literal();

            // the datatype should already be set.  Call discoverDatatype() on the literal, if not.
            if ( literal.getLiteral().datatype() != 'sd:SPARQL11Update' ) {
                console.warn('[line]', 'literal is not of sd:SPARQL11Update datatype');
                // consider: test this using instanceOf
                return;
            }
            return literal.datatype().query();   // consider: rename literal() to widget()
        },
        executeSparql: function() {
            var query = this.discoverSparql();
            if ( ! query ) {
                return;
            }

            // should:
            // container = this.newChildContainer({query: function() { return line.discoverSparql(); } loadAll: true});
            this.getChildList().remove();       // blow away any past responses
            var container = this.getChildContainer();
            container.option('describeElements', false);
            container.option('sourceElement', container.element);
            container.element.attr('about', $.notepad.newUri()); // should: have one URI per invocation (or response)
            this.getChildContainer().option('query', query);     // should: have the container obtain a new query everytime it is invoked
            this.getChildContainer().loadAll();
        },


    });

}(jQuery));
