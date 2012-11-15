(function($, undefined) {

    FORWARD = 0;    // TODO: put in a namespace
    BACKWARD = 1;

    getAttrName = $.fn.getAttrName = function(direction) {
        return ( direction === undefined || direction === FORWARD ? "rel" : "inrel" );
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
        _getDirection: function() {
            return this.getPredicate() ? this.getPredicate().getDirection() : undefined;
        },
        getDirection: function() {
            if (this.predicate.attr(getAttrName(FORWARD))) {
                return FORWARD;
            } else if (this.predicate.attr(getAttrName(BACKWARD))) {
                return BACKWARD;
            }
            return FORWARD;
        },
        hasObjectUri: function() {
            return (this.getUri() !== undefined);
        },
        hasObjectLiteral: function() {
            return !this.hasObjectUri();
        },

        // Line Uri        
        getUri: function() {
            return this.getObject().getObjectUri();
        },
        _setUri: function(uri) {
            this.element.attr('about',uri);
            return this;
        },      
        setUri: function(uri) {
            this.getObject().setObjectUri(uri);
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
        setContainerPredicateUri: function(uri, direction, triple) {
            direction = (direction !== undefined) ? direction : this.getDirection();
            this._setContainerPredicateUri(uri, direction);

            // if (triple === undefined && this.getContainerPredicateLabel() !== undefined) {
            //     // TODO: fix: 
            //     return;
            // }

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
        getContainerPredicateLabel: function() {
            return this.predicate.val();
        },
        getContainerPredicateUri: function() {
            if (this.getDirection()===FORWARD) {
                return this.predicate.attr(getAttrName(FORWARD));
            } else {
                return this.predicate.attr(getAttrName(BACKWARD));
            }

            // var predicateUri = {
            //     uri: this.predicate.attr(getAttrName(FORWARD)) || this.predicate.attr(getAttrName(BACKWARD)),
            //     element: this.predicate
            // };
            // predicateUri.__proto__.toString = function() { return this.uri; }
            // return predicateUri;
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

        triple: function() {
            if ( this.getObject().getResource() === undefined ) {
                // An object can have an undefined value, for example when the literal() is empty
                return undefined;
            }

            var operation = this.predicate.hasClass("delete") ? 'delete' : 'update';
            if (this.getDirection() === FORWARD) {
                return new Triple(
                    this.getSubjectUri(),
                    this.getContainerPredicateUri(),
                    this.getObjectResource(),
                    operation
                );
            } else {
                return new Triple(
                    this.getObjectResource(),
                    this.getContainerPredicateUri(),
                    this.getSubjectUri(),
                    operation
                );
            }
        },
        getContainerTriple: function() {
            return this.triple();
        },

        old_getContainerTriple: function() {
            if (this.predicate.hasClass("delete")) {
                return new Triple(
                    this.subject(),
                    this.getContainerPredicateUri(),
                    this.getObject().getResource(),
                    // If the object is a literal, then we should call this.object().getPreviousLiteral()
                    //this.getPreviousLiteral(),
                    "delete"
                );
            }
            if ( this.getObject().getResource() === undefined ) {
                // An object can have an undefined value, for example when the literal() is empty
                return undefined;
            }
            var tripleObject;

            if (this.getDirection() === FORWARD) {
                tripleObject = this.getObject().getResource();
            } else {
                tripleObject = this.getContainerUri();
            }
            return new Triple(
                this.subject(),
                this.getContainerPredicateUri(),
                tripleObject,
                "update"                
            );
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
        getPredicateLabelTriple: function() {
            if (this.getLineLiteral() == '' || this.getContainerPredicateLabel() == '') {
                return undefined;
            }
            return new Triple(
                this.getContainerPredicateUri(),
                "rdfs:label",
                this.getContainerPredicateLabel()
                );
        },
        getObjectElement: function () {
            return this.element.find('.notepad-object');
        },
        getObject: function() {
            return this.getObjectElement().data('notepad-object');
        },

        getSubjectElement: function() {
            return this.element.children('.notepad-subject');
        },
        setSubjectElement: function(element) {
            this.getSubjectElement().remove();
        },
        _createSubject: function(uri) {
            var subjectElement = $('<div>').addClass('').attr('about', uri).label().prependTo(this.element);
            $('<div>').attr('about', uri).label();
        },


        setSubjectUri: function(uri) {
            if (this.getSubjectElement() === undefined) {
                this._createSubject(uri);
            }
            
            this.element.attr('about',uri);

            // TODO: this should trigger displaying the subject URI
        },
        getSubjectUri: function() {
            return this.element.closest('[about]').attr('about');
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
                    this.setSubjectUri(triple.subject);
                    this.getPredicate().setUri(triple.predicate);
                    this.setContainerPredicateUri(triple.predicate, FORWARD);
                    this.setObjectResource(triple.object);
                } else if ( this.getContainerUri() == triple.object ) {
                    // Backward
                    this.setSubjectUri(triple.object);
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
                this.setSubjectUri(triple.object);  
                this.setPredicate().setUri(triple.predicate);
                this.getPredicate().toggleDirection(false);
                this.setContainerPredicaterUri(triple.predicate, BACKWARD);
                this.setObjectResource(this.subject);
                return;
            }
            this.setSubjectUri(triple.subject)
            this.setPredicate().setUri(triple.predicate);
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
            this.getObject().setObjectLiteral(text);
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
            return this.element.find('ul');  // use find instead of children because jqueryui can move the element during transitions
        },
        getChildContainer: function() {
            return this.getChildList().data('container');
        },
        getLines: function() {
            return this.getChildContainer().getLines();
        },
        appendLine: function(li) {
            // Find or create list
            var ul = this.getChildList();
            if (ul.length==0) {
                ul = $('<ul>').appendTo(this.element).container();
            }
            return ul.data('container').appendLine(li);
        },
        insertLineAfter: function() {
            var li = $('<li>').insertAfter(this.element).line();
            return li.data('line');
        },
        insertLineBefore: function() {
            var li = $('<li>').insertBefore(this.element).line();
            return li.data('line');
        },

        childTriples: function() {
            if (this.getUri() === undefined) {
                return [];
            }
            if (this.getChildContainer() === undefined) {
                throw new Error("somehow, we can't find a child container anymore");
            }
            return this.getChildContainer().triples();
        },
        triples: function() {
            var triples = new Triples(0);

            var container = this.getContainerTriple();
            if (container !== undefined) {
                triples.push(container);
            }
            var predicate = this.getPredicateLabelTriple();
            if (predicate !== undefined) {
                triples.push(predicate);
            }

            var line = this.getLineTriple();
            if (line !== undefined) {
                triples.push(line);
            }

            var childTriples = this.childTriples();            
            if (childTriples.length) {
                $.merge(triples, childTriples);
            }
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
            newParentLine.data('line').appendLine(this.element);
        },
        unindent : function(event) {
            // Determine the new location
            var newPredecessor = this.element.parent('ul').parent('li');

            // Prevent moving if we couldn't find the new parent
            if (!newPredecessor.length) {
                return false;
            }

            // Move current line to parent
            this.element.insertAfter(newPredecessor);
        },
        getPredicate: function() {
            return this.element.children(":notepad-predicate").data('predicate');
        },
        _createPredicateWidget: function() {
            var element = $('<div>').appendTo(this.element).predicate({initialTriple: this.options.initialTriple});
        },
        _createPredicate: function() {
            // Predicate toggle
            var line = this;
            this.predicateToggle = $('<a>').addClass('predicateToggle');
            this.predicateToggle.click(function(){
                line.toggleContainerPredicate();
            });

            // Predicate
            this.predicate = $('<textarea rows="1" cols="8">').addClass('notepad-predicate');
            this.predicate.contextMenu( {menu: 'predicateMenu'}, 
                function(action, ele, pos) {
                    if (action == 'delete') {
                        ele.toggleClass('delete');
                        return;
                    } else if (action == 'toggleDirection') {
                        ele.data('predicate').toggleDirection();
                    }
                    throw ("unknown action from contextmenu", action);
                });

            // Find whether this line has a predecessorPredicate
            var predecessorLine = $(this.element).prev().data('line');
            var predicate;
            if (predecessorLine) {
                predicate = predecessorLine.getContainerPredicateUri();
            } else {
                predicate = this._getContainerDefaultPredicate();
            }
            if (this.options.initialTriple === undefined) {
                // Set the initial predicate URI only if we are not setting an initial triple
                this.setContainerPredicateUri(predicate);
            }

            this.predicate.change(function(event) {
                line.setContainerPredicateLabel($(event.target).val());
            });
            this.element.append(this.predicate);

            // Must turn on autocomplete *after* the element has
            // been added to the document
            var notepad = this.getNotepad();
            this.predicate.autocomplete({
                source: function(term,callback) {
                    notepad.getPredicatesLabelsByLabel(term.term,callback);
                },

                select: function(event,ui) {
                    var line = $(event.target).parent('li').data('line');
                    line._setContainerPredicateLabel(ui.item.label);
                    line._setContainerPredicateUri(ui.item.value);
                    event.preventDefault();  // prevent the default behaviour of replacing the text with the value
                }
            });
            
            // Separator
            var separator = $('<span>').addClass('notepad-separator');
            this.element.append(separator);

            // Insert the toggle after the ':'
            this.element.append(this.predicateToggle);
            
            // Set the initial state of predicate and separator
            var newlinePredicateHidden;
            if ( predecessorLine ) {
                newlinePredicateHidden = predecessorLine.element.find('.predicateToggle').hasClass('hidden');
            } else {
                newlinePredicateHidden = true;
            }
            if ( this.options.hidePredicateWhenRepeated && newlinePredicateHidden ) {
                this.predicateToggle.addClass('hidden');
                this.predicate.css('display', 'none');
                separator.css('display', 'none');
            }
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
        _createObject1: function(objectText) {
            var objectElement = $('<div>').text(objectText);
            objectElement.appendTo(this.element);                   // WORKS
            objectElement.object();
        },
        _createObject: function(objectText) {
            var objectElement = $('<div>').text(objectText);
            objectElement.appendTo(this.getPredicate().element);
            objectElement.object();
        },
        _createChildContainer: function() {
            var childContainerElement = $('<ul>').appendTo(this.element).container();
            var childContainer = childContainerElement.data('container');

            { // TODO: refactor into container( {param: objectElement});
                // set the URI on the child container to: get it to load based on the notepad-object
                var objectElement = this.getObjectElement();
                childContainer.option('sourceElement', objectElement);
                objectElement.bind("objecturichange", function() {
                    if (!line.collapsed()) {
                        childContainer.load();
                    }
                });
            }

            // Children collapse/expand
            var childrenToggle = $('<a>').addClass('childrenToggle');
            var line = this;
            childrenToggle.click(function(event) {
                line.childrenToggle();
            });
            this.element.prepend(childrenToggle);

            // Initial state depends on the container
            var childrenCollapsed = this.getContainer().option('collapsed');
            this.childrenToggle(childrenCollapsed);
        },

        // Set up the line widget
        _create: function() {
            // Verify the container
            if(!this.getContainer()) {
                throw new Error("when creating a new line, should find a parent container");
            }

            this.element.addClass("notepad-line");
            
            // Save the initial content of the line to later initialize the object with it.
            var objectText = this.element.text();
            this.element.text("");
            
            this._createPredicate();
            this._createPredicateWidget();
            this._createColumnObjects();
            this._createObject(objectText);
            this._createChildContainer();
        },

        getChildrenToggle: function() {
            return this.element.children('.childrenToggle');
        },
        collapsed: function() {
            return this.getChildrenToggle().hasClass('collapsed');
        },
        childrenToggle: function(collapse) {
            var toggleElement = this.getChildrenToggle();
            if (collapse === undefined) {
                collapse = ! this.collapsed();
                log.debug(collapse);
            }
            if (collapse) {
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
            this.predicate.remove();
            this.subject.unbind().remove();
        },

    });

}(jQuery));
