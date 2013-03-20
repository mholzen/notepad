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
                    matchLine = ( $(this).find(':notepad-label[about="' + selector.line + '"]').length !== 0 );
                } else {
                    matchLine = ( $(this).find('.notepad-object3 [rel="rdfs:label"]').text() == selector.line );
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

        getNotepad: function() {
            return this.getContainer().getNotepad();
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
        getUri: function() {
            return this.getObject().uri().getUri();
        },
        _setUri: function(uri) {
            this.element.attr('about',uri);
            return this;
        },      
        setUri: function(uri) {
            this.getObject().uri().setUri(uri);
            this.getChildContainer().unload();
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
        setContainerPredicateUri: function(uri, direction) {
            this.getPredicate().setUriDirection(uri, direction);
            this.updatePredicateDisplay();
        },
        newContainerPredicateUri: function(term) {
            this.getPredicate().newUri(term);
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
            this.getPredicate().getLabel().element.hide();
        },
        updatePredicateDisplay: function() {
            if (this.getPredicate().getUri() === this.getContainer().options.predicate
                && this.getDirection() === FORWARD) {
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
            return this.getObject().getResource();
        },

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

        getLineLiteral: function() {
            if (!this.getObject().isLiteral()) {
                return undefined;
            }
            return this.getObject().literal().getLiteral();
        },
        setLineLiteral: function(text) {
            this.getObject().setLiteral(text);
            this.showChildren();        // A literal has no children, so this effectively ensures we have a '-' and not a '+'
            return this;
        },
        // Children elements
        getChildList: function() {
            var ul = this.getObject().element.find('ul:eq(0)');  // use find instead of children because jqueryui can move the element during transitions
            if (ul.length === 0) {
                var parentElement = this.getObject().element;
                ul = $('<ul>').appendTo(parentElement); // .sortable();
            }
            return ul;
        },
        _createChildContainer: function() {
            var objectElement = $(this.getObject().element[0]);
            var container = this.getChildList().container().data('notepadContainer');
            var line = this;
            objectElement.on("urilabelurichange", function(event) {
                if (event.target != objectElement[0]) {
                    log.debug("ignoring event for another target");
                    return;
                }
                event.stopPropagation();

                if (line.options.describeDepth === 0) {
                    return;
                }

                if (!line.collapsed()) {
                    container.load();
                }
                return false; // prevent this event from being caught by any labels in the path to root
            });

            this._createChildToggle();

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

        childTriples: function() {
            if (this.getChildContainer() === undefined) {
                throw new Error("somehow, we can't find a child container anymore");
            }
            return this.getChildContainer().triples();
        },
        triples: function() {
            var triples = new Triples();

            var predicateTriples = this.getPredicate().triples();
            $.merge(triples, predicateTriples);

            return triples;
        },

        focus: function() {
            return this.getObject().focus();
        },
        indent : function() {
            // when the line is top level, then don't move
            var newParentLine = this.element.prev('li');
            if (!newParentLine.length) {
                return false;
            }

            // Move current line to newParent
            return newParentLine.data('notepadLine').appendChildLine(this.element);
        },
        unindent : function(event) {
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
            var describeElements = this.getContainer().option('describeElements');
            if (!describeElements || this.options.describeDepth === 0) {
                this.hideChildren();
            }

            // No need to show because the initial state is: not collapsed, children shown
            // thus avoiding an unnecessarey refresh and reload
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
            var enclosingLabel = this.getContainer().element.closest(":notepad-label");
            if (enclosingLabel.length > 0) {
                enclosingLabel.data('notepadLabel').ensureUri();
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

            this._ensureSubjectUriExists();

            this.element.addClass("notepad-line");      // TODO: change all .notepad-* to :notepad-*
            
            // Save the initial content of the line to later initialize the object with it.
            var objectText = this.element.text();
            this.element.text("");
            
            this._createPredicate();                    // Creates the predicate and the first object
                                                        // Sets the URI, which fails to trigger the child container
            this._createColumnObjects();
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
                if (!this.getObject().isUri()) {
                    return;
                }
                this.getChildList().show();
                this.getChildContainer().refresh();
            }
        },

        detach: function() {
            this.getObject().detach();
            this.element.remove();
        },

        _destroy : function() {
            console.log('destroying line');
            if (this.getNotepad()) {
                this.getNotepad().unloaded(this.triples());
            }
            this.getPredicate().element.remove();
            this.element.removeClass("notepad-line").removeAttr('about');
        },

        addCheckboxToChildLines: function() {
            this.getChildContainer().element.children('li').prepend('<input type="checkbox">');
        },

    });

}(jQuery));
