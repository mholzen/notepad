(function($, undefined) {

    FORWARD = 0;    // TODO: put in a namespace
    BACKWARD = 1;

    getAttrName = $.fn.getAttrName = function(direction) {
        return ( direction === undefined || direction === FORWARD ? "rel" : "rev" );
    }

    // A line matcher, based on the container uri and the triple
    Selector = $.fn.Selector = function(uri, triple) {
        var lineUri, direction;
        if (uri == triple.subject) {
            this.direction = FORWARD;
            this.lineUri = triple.object;
        } else if (uri == triple.object) {
            this.direction = BACKWARD;
            this.lineUri = triple.subject;
        } else {
            return undefined;
        }
        this.predicate = triple.predicate;
        return this;
    }

    Selector.prototype = {
        toString: function() {
            var selector = "";
            if (this.predicate) {
                selector = selector + '[' + getAttrName(direction) + '="' + this.predicate +'"]';
            }
            if (this.lineUri) {
                selector = selector + '[about="' + this.lineUri +'"]';
            }
            return selector;
        }
    }

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
            return this.getObject().getUri();
        },
        _setUri: function(uri) {
            this.element.attr('about',uri);
            return this;
        },      
        setUri: function(uri) {
            this.getObject().setUri(uri);
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
            return this.element.parents('.notepad-container').data("container");
        },
        getContainerUri: function() {
            return this.getContainer().getUri();
        },
        _getContainerDefaultPredicate: function() {
            return this.getContainer().getDefaultPredicate();
        },
        _setPredicateUri: function(uri) {
            this.getPredicate().setUri(uri);
        },
        setContainerPredicateUri: function(uri, direction) {
            this.getPredicate().setUri(uri);
            if (direction === BACKWARD) {
                this.getPredicate().toggleDirection(false);
            }
        },
        _setContainerPredicateUri: function(uri, direction, triple) {
            direction = (direction !== undefined) ? direction : this.getDirection();
            this._setContainerPredicateUri(uri, direction);

            var line = this;
            this.getEndpoint().getLabels(uri, function(labels) {
                if (labels.length == 0) {
                    log.debug("Can't find a label given a predicate uri ("+uri+")");
                    labels[0] = '';
                }
                if (labels.length > 1) {
                    log.debug("Warning: more than one ("+labels.length+") label ["+labels+"] for a given uri ("+uri+").  Picking first ("+labels[0]+")");
                }
                var label = labels[0];

                line._setContainerPredicateLabel(label);

                if ((uri.toString() === 'rdfs:member' || label === 'member') && direction === FORWARD) {
                    line.hideContainerPredicate();
                } else {
                    line.showContainerPredicate();
                }
            });
        },
        _setContainerPredicateUri: function(uri, direction) {
            this.predicate.removeAttr(getAttrName(FORWARD));
            this.predicate.removeAttr(getAttrName(BACKWARD));
            this.predicate.attr(getAttrName(direction),uri);
        },
        setContainerPredicateLabel: function(label) {
            this._setContainerPredicateLabel(label);
            var line = this;
            this.getEndpoint().getPredicatesLabelsByLabel(label,function(results) {
                var uri;
                if (results.length == 0) {
                    uri = $.notepad.getNewUri();
                } else {
                    uri = results[0].value;
                }
                if (results.length > 1) {
                    log.debug("Warning: more than one ("+results.length+") uri ["+results.toString()+"] for a given label ("+label+").  Picking first ("+uri+")");
                }
                line._setContainerPredicateUri(uri);
            });
        },
        _setContainerPredicateLabel: function(label) {
            this.predicate.val(label);
        },
        getContainerPredicateUri: function() {
            return this.getPredicate().getUri();
        },
        _getContainerPredicateUriByLabel: function(label) {
            var uri = this.getContainer().predicateMap[label];
            if (uri === undefined) {
                throw "cannot find a uri matching the label " + label;
            }
            return uri;
        },      
        _getContainerPredicateLabelByUri: function(uri) {
            var map =  this.getContainer().predicateMap;
            for (var label in map) {
                if (map[label] == uri) {
                    return label;
                }
            }
            throw "cannot find a label from the URI "+uri;
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

        showContainerPredicate: function() {
            this.predicateToggle.removeClass("hidden");
            this.predicateToggle.parent().children(".notepad-predicate").slideDown(100);
            this.predicateToggle.parent().children(".notepad-separator").slideDown(100);
        },
        hideContainerPredicate: function() {
            this.predicateToggle.addClass("hidden");
            this.predicateToggle.parent().children(".notepad-predicate").slideUp(100);
            this.predicateToggle.parent().children(".notepad-separator").slideUp(100);
        },
        toggleContainerPredicate: function() {
            this.predicateToggle.toggleClass("hidden");
            this.predicateToggle.parent().children(".notepad-predicate").slideToggle(100);
            this.predicateToggle.parent().children(".notepad-separator").slideToggle(100);  
        },
        getObject: function() {
            return this.getPredicate().element.find('.notepad-object3').data('label');
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
                    this.getPredicate().setUri(triple.predicate);
                    this.setContainerPredicateUri(triple.predicate, FORWARD);
                    this.setObjectResource(triple.object);
                } else if ( this.getContainerUri() == triple.object ) {
                    // Backward
                    this.getPredicate().setUri(triple.predicate);
                    this.getPredicate().toggleDirection(false);
                    this.setContainerPredicateUri(triple.predicate, BACKWARD);
                    this.setObjectResource(triple.subject);
                }
                return;
            }
            if (triple.subject.equals(this.getUri())) {
                // No need to set the subject
                this.getPredicate().setUri(triple.predicate);
                this.setContainerPredicateUri(triple.predicate, FORWARD);
                this.setObjectResource(triple.object);
                return;
            }
            if (triple.object.equals(this.getUri())) {
                this.getPredicate().setUri(triple.predicate);
                this.getPredicate().toggleDirection(false);
                this.setContainerPredicaterUri(triple.predicate, BACKWARD);
                this.setObjectResource(this.subject);
                return;
            }
            this.setSubjectUri(triple.subject)
            this.getPredicate().setUri(triple.predicate);
            this.setContainerPredicateUri(triple.predicate, FORWARD);
            this.setObjectResource(triple.object);
        },

        // Object representation
        getLinePredicateUri: function() {
            return "rdfs:label";
        },
        _setLinePredicateUri: function() {
            throw new Error("not yet implemented");
        },
        getLineLiteral: function() {
            return this.getObject().getObjectLiteral();
        },
        setLineLiteral: function(text) {
            this.getObject().setLiteral(text);
            return this;
        },
        getLineTriple: function() {
            if (this.hasObjectLiteral()) {
                return undefined;
            }
            if (this.getLineLiteral() == '') {
                return undefined;
            }

            return new Triple(
                this.getUri(),
                this.getLinePredicateUri(),
                this.getLineLiteral()
                );
        },
        setLineTriple: function(triple) {
            this.setUri(triple.subject);
            if (triple.predicate !== 'rdfs:label') {
                throw new Error("line triple predicate is not rdfs:label");
            }
            this._setLiteral(triple.object);
        },

        // Children elements
        getChildList: function() {
            var ul = this.getObject().element.find('ul:eq(0)');  // use find instead of children because jqueryui can move the element during transitions
            if (ul.length === 0) {
                var parentElement = this.getObject().element;
                ul = $('<ul>').appendTo(parentElement);
            }
            return ul;
        },
        _createChildContainer: function() {
            var objectElement = $(this.getObject().element[0]);
            var container = this.getChildList().container().data('container');
            var line = this;
            objectElement.on("labelurichange", function(event) {
                if (!line.collapsed()) {
                    container.load();
                }
                event.stopPropagation();
                return false; // prevent this event from being caught by any labels in the path to root
            });

            this._createChildToggle();

            return container;
        },

        getChildContainer: function() {
            var container = this.getChildList().data('container');
            if (!container) {
                container = this._createChildContainer();
            }
            return container;
        },
        getLines: function() {
            return this.getChildContainer().getLines();
        },
        appendChildLine: function(li) {
            this.showChildren();
            return this.getChildContainer().appendLine(li);
        },
        insertLineAfter: function() {
            // When a line has children, it should insert before any child
            if (this.getLines().length > 0) {
                return this.getLines()[0].insertLineBefore();
            }
            var li = $('<li>').insertAfter(this.element).line();
            return li.data('line');
        },
        insertLineBefore: function() {
            var li = $('<li>').insertBefore(this.element).line();
            return li.data('line');
        },

        childTriples: function() {
            // if (this.getUri() === undefined) {
            //     return [];
            // }
            if (this.getChildContainer() === undefined) {
                throw new Error("somehow, we can't find a child container anymore");
            }
            return this.getChildContainer().triples();
        },
        triples: function() {
            var triples = new Triples(0);

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
            return newParentLine.data('line').appendChildLine(this.element);
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
            return this.element.children(":notepad-predicate").data('predicate');
        },
        _createChildToggle: function() {
            // Children collapse/expand
            var childrenToggle = $('<a>').addClass('childrenToggle');
            var line = this;
            childrenToggle.click(function(event) {
                line.childrenToggle();
            });
            this.element.prepend(childrenToggle);

            // Initial state depends on the container
            var describeElements = this.getContainer().option('describeElements');
            if (!describeElements) {
                this.hideChildren();
            }
            // No need to show because the initial state is: not collapsed, children shown
            // thus avoiding an unnecessarey refresh and reload
        },
        _createPredicate: function() {
            var element = $('<div>').appendTo(this.element).predicate();
            var predicate = element.data('predicate');

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

                var object = objectElement.data('object');
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
                enclosingLabel.data('notepad-label').ensureUri();
            }
        },
        // Set up the line widget
        _create: function() {
            // Verify the container

            this._ensureSubjectUriExists();

            this.element.addClass("notepad-line");      // TODO: change all .notepad-* to :notepad-*
            
            // Save the initial content of the line to later initialize the object with it.
            var objectText = this.element.text();
            this.element.text("");
            
            this._createPredicate();                    // Creates the predicate and the first object
                                                        // Sets the URI, which fails to trigger the child container
            this._createColumnObjects();
            //this._createChildContainer();          
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
            if (hide) {
                toggleElement.addClass('collapsed');
                this.getChildList().hide('blind', {}, 100);
            } else {  // expand
                toggleElement.removeClass('collapsed');
                this.getChildList().show('blind', {}, 100);
                this.getChildContainer().refresh();
            }
        },
        _destroy : function() {
            this.element.removeClass("notepad-line").removeAttr('about');
        },

    });

}(jQuery));
