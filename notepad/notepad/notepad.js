(function($, undefined) {

     var DEFAULT_NAMESPACES = {
         xsd:  "http://www.w3.org/2001/XMLSchema#",
         rdf:  "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
         rdfs: "http://www.w3.org/2000/01/rdf-schema#",
         owl:  "http://www.w3.org/2002/07/owl#",
     };

     function guidGenerator() {
         var S4 = function() {
            return (((1+Math.random())*0x10000)|0).toString(16).substring(1);
         };
         return (S4()+S4()+"-"+S4()+"-"+S4()+"-"+S4()+"-"+S4()+S4()+S4());
     }

    // Resource and Triple abstract the interface between Notepad and an RDF library
    // TODO: "import Resource, Triple"
    _stringToRdfResource = function(value) {
        if (value.indexOf('[]')==0) {
            return $.rdf.blank('_:'+guidGenerator());
        }
        if (value.indexOf('_:')==0) {
            return $.rdf.blank(value);
        }
        if ( value.indexOf('http://') == 0 || value.indexOf('file://') == 0) {
            // TODO: make more specific
            return $.rdf.resource('<' + value.toString() + '>', {namespaces: DEFAULT_NAMESPACES} );
        }
        if ( value.indexOf(':') == 0) {
            return $.rdf.resource('<' + $.uri.base() + '#' + value.toString().slice(1) + '>' );
        }
        if ( value.indexOf(':') != -1) {
            // TODO: make more specific
            return $.rdf.resource(value.toString(), {namespaces: DEFAULT_NAMESPACES} );
        }        
        return $.rdf.literal('"'+value.toString()+'"');
    };
    _fusekiToRdfResource = function(value) {
        if (value.type == 'bnode' && value.value ) {
            return $.rdf.blank("_:" + value.value);
        }
        if (value.type == 'uri' && value.value ) {
            return $.rdf.resource('<' + this._string + '>', {namespaces: DEFAULT_NAMESPACES} );
        }
        if (value.type == 'literal' && value.value ) {
            return$.rdf.literal('"'+value.value.toString()+'"');
        }
        throw "cannot create an RDF resource from a Fuseki object";
    };
    
    Resource = function(value) {
        if ( value.type && value.value ) {
            this.resource = _fusekiToRdfResource(value);
        } else if ( value.resource ) {
            this.resource = value.resource;
        } else {
            this.resource = _stringToRdfResource(value);            
        }
        return this;
    }
    Resource.prototype.isBlank = function() {
        return (this.resource.type=='bnode');
    };
    Resource.prototype.isUri = function() {
        return (this.resource.type=='uri');
    };
    Resource.prototype.isLiteral = function() {
        return (this.resource.type=='literal');
    };
    Resource.prototype.toString = function() {
        if (this.isBlank()) {
            return this.resource.toString();
        }
        if (this.resource.type == 'uri') {
            try {
                return $.createCurie(this.resource.toString().slice(1,-1), {namespaces: DEFAULT_NAMESPACES, reservedNamespace: $.uri.base()+'#' });
            } catch (err) {
                return this.resource.toString().slice(1,-1); // Remove encapsulating angle brackets
            }
        }
        if (this.resource.type == 'literal') {
            return this.resource.toString().slice(1,-1); // Remove encapsulating double quotes ""
        }
    };
    Resource.prototype.toRdfResource = function() {
        return this.resource;
    };
    Resource.prototype.equals = function(resource) {
        return this.toString() === resource.toString();
    };
    Triple = function(subject,predicate,object) {
        this.subject = new Resource(subject);
        this.predicate = new Resource(predicate);
        this.object = new Resource(object);
    };
    Triple.prototype.toString = function() {
        return this.subject + ' ' + this.predicate + ' ' + this.object + '.';
    };
    Triple.prototype.equals = function(triple) {
        return this.subject.equals(triple.subject) && this.predicate.equals(triple.predicate) && this.object.equals(triple.object);
    };
    Triples = function(triples) {
        return $.map(triples, function(e,i) { return new Triple(e[0], e[1], e[2]); });
    };

    var CONTAINER_DEFAULT_PREDICATE_ATTR = 'container-default-predicate';

    $.widget("notepad.container", {

        getNotepad: function() {
            return this.element.parents('.notepad').data("notepad");
        },

        getLines: function() {
            return this.element.children('li').map(function(index, line) { return $(line).data('line'); } );
        },
        appendLine: function(li) {
            if (li == undefined) {
                li = $('<li>');
            }
            li.appendTo(this.element).line();
            return li.data('line');
        },
        getUri: function() {
            return this.element.parents('[about]').attr('about');
        },
        getDefaultPredicate: function() {
            var predicate = this.element.attr(CONTAINER_DEFAULT_PREDICATE_ATTR);
            if (predicate===undefined) {
                predicate = 'rdfs:member';
            }
            return predicate;
        },
        
        triples: function() {
            return this.getLines().map(function(index,line) {
                return line.triples();
            });
        },
        
        _updateFromRdf: function(triples) {
            // Update the immediate descendant children
            var container = this;
            $.each(triples, function(index,triple) {
                if (triple.subject != container.getUri()) {
                    return; // This triple will not affect this container
                }
                if (container.getNotepad().contains(triple)) {
                    return;
                }

                // Update a line based on the object
                if (!triple.object.isLiteral()) {
                    var selector = 'li[about="'+triple.object+'"]';
                    var lines = container.element.find(selector);

                    // If there are multiple lines, we need additional triples to identify the lines to find or create
                    if (lines.length > 1) {
                        throw "multiple lines of identical RDF: requires more triples to distinguish them";
                    }
                    if (lines.length == 1) {
                        line = $(lines[0]).data('line');
                    } else {
                        line = container.appendLine();
                        // TODO: decide: a: should this trigger refreshing its children or b: should we build up a list
                        // TEST: a
                        line.setUri(triple.object);
                    }
                    line.setContainerPredicateUri(triple.predicate);  // TODO: handle multiple
                }
            });
            this._updateLabelsFromRdf(triples);
        },
        _updateLabelsFromRdf: function(triples) {
            // Update the representations of all children line
            var container = this;
            $.each(triples, function(index,triple){
                if (triple.predicate != 'rdfs:label') {
                    return;
                }
                // Find a line with the subject as URI
                container.element.find('li[about="'+triple.subject+'"]').each(function(i,li) {
                    $(li).data('line').setLineLiteral(triple.object);
                })
            });
        },
        
        // Set up the widget
        _create : function() {
            this.element.addClass("notepad-container");

            if (this.getUri() === undefined) {
                throw "Cannot find a URI for this list";
            }            
        },
        _destroy : function() {
            this.element.removeClass("notepad-container").removeAttr('about');
        }
    });
    
    $.widget("notepad.line", {

        // A line is a widget representing 
        //  1 - a URI (get/setUri)
        //  2 - an optional representation as text (get/setLineLiteral, get/setLineTriple)
        //  3 - a relationship to a container (get/setContainerTriple, get/setContainer)
        //  4 - a collection of other lines for which it is the container (getList)
                
        // A new line should have a URI but no representation.
        
        // The container defines
        //    - a container URI
        //    - a container default predicate
        
        options : {},

        notepad : undefined,

        // Line Uri
        
        getUri: function() {
            return this.element.attr("about");
        },
        _setUri: function(uri) {
            this.element.attr('about',uri);
            return this;
        },      
        setUri: function(uri) {
            this._setUri(uri);
            
            // Setting the URI should update the line representation and any children
            var line = this;
            this.notepad.getRdfBySubject(uri, function(triples) {
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
            line.getList().data('container')._updateFromRdf(triples);
        },

        // Container
        _getContainer: function() {
            return this.element.parents('.notepad-container').data("container");
        },
        _getContainerUri: function() {
            return this._getContainer().getUri();
        },
        _getContainerDefaultPredicate: function() {
            return this._getContainer().getDefaultPredicate();
        },
        setContainerPredicateUri: function(uri) {
            this._setContainerPredicateUri(uri);
            var label = this._getContainerPredicateLabelByUri(uri);
            this._setContainerPredicateLabel(label);                
        },
        _setContainerPredicateUri: function(uri) {
            this.predicate.attr('rel',uri);            
        },
        setContainerPredicateLabel: function(label) {
            this._setContainerPredicateLabel(label);
            var uri = this._getContainerPredicateUriByLabel(label);
            this._setContainerPredicateUri(uri);
        },
        _setContainerPredicateLabel: function(label) {
            this.predicate.val(label);
        },
        _getContainerPredicateUri: function() {
            return this.predicate.attr('rel');
        },
        _getContainerPredicateUriByLabel: function(label) {
            var uri = this.notepad._predicateMap[label];
            if (uri === undefined) {
                throw "cannot find a uri matching the label " + label;
            }
            return uri;
        },      
        _getContainerPredicateLabelByUri: function(uri) {
            var map =  this.notepad._predicateMap;
            for (var label in map) {
                if (map[label] == uri) {
                    return label;
                }
            }
            throw "cannot find a label from the URI "+uri;
        },
        getContainerTriple: function() {
            return new Triple(
                this._getContainerUri(),
                this._getContainerPredicateUri(),
                this.getUri()
            );
        },
        
        // Line representation
        _getLinePredicateUri: function() {
            return "rdfs:label";
        },
        _setLinePredicateUri: function() {
            throw "not yet implemented";
        },
        getLineLiteral: function() {
            return this.object.val();
        },
        setLineLiteral: function(text) {
            this.object.val(text);
            return this;
        },
        getLineTriple: function() {
            return new Triple(
                this.getUri(),
                this._getLinePredicateUri(),
                this.getLineLiteral()
            );
        },
        setLineTriple: function(triple) {
            this.setUri(triple.subject);
            if (triple.predicate !== 'rdfs:label') {
                throw "line triple predicate is not rdfs:label";
            }
            //this._setObjectPredicate('');  // rdfs:label
            this._setLiteral(triple.object);
        },

        // Children elements
        getList: function() {
            return this.element.children('ul');
        },
        getLines: function() {
            return this.getList().children('li');
        },
        appendLine: function(li) {
            // Find or create list
            var ul = this.getList();
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
            return this.getLines().map(function(index,li) {
                return $(li).data('line').triples();
            });
        },
        triples: function() {
            var triples = [this.getContainerTriple(), this.getLineTriple()];
            var childTriples = this.childTriples();            
            if (childTriples.length) {
                $.merge(triples, childTriples);
            }
            return triples;
        },

        focus: function() {
            return this.element.children(".object").focus();
        },

        getNotepad: function() {
            // TODO: remove duplicate with container.notepad
            return this.element.parents('.notepad').data("notepad");
        },
        // Set up the widget
        _create : function() {
            var line = this;

            // Find parent notepad for use by getPredicateBy _predicateMap
            this.notepad = this.getNotepad();
            if (!this.notepad) {
                throw "when creating a new line, should find a parent notepad";
            }

            // Verify the container
            if(!this._getContainer()) {
                throw "when creating a new line, should find a parent container";
            }
            
            this.element.addClass("line");
            this._setUri(this.getNotepad()._getNewUri());
            
            // Predicate toggle
            this.predicateToggle = $('<a>').addClass('predicateToggle hidden');
            this.predicateToggle.click(function(){
                $(this).toggleClass("hidden");
                $(this).parent().find(".predicate").toggle('drop', {}, 100);
                $(this).parent().find(".separator").toggle('drop', {}, 100);
            });
            this.element.append(this.predicateToggle);

            // Predicate
            this.predicate = $('<textarea rows="1">').addClass('predicate');
            this.setContainerPredicateUri(this._getContainerDefaultPredicate());

            var notepad = this;
            this.predicate.change(function(event) { 
                line._setContainerPredicateUri(
                    notepad._getContainerPredicateUriByLabel( $(event.target).val() )
                );
            });
            this.element.append(this.predicate);

            // Must turn on autocomplete *after* the element has
            // been added to the document
            this.predicate.autocomplete({
                source : Object.keys(this.getNotepad()._predicateMap),
                select : function(event,ui) {
                    var line = $(event.target).parent('li').data('line');
                    line.setContainerPredicateLabel(ui.item.label)
                    event.preventDefault();  // prevent the default behaviour of replacing the text with the value
                }
            });
            
            // Separator
            var separator = $('<span>').addClass('separator');
            this.element.append(separator);
            
            // Initial state of predicate and separator is hidden
            this.predicate.css('display', 'none');
            separator.css('display', 'none');


            // Object
            this.object = $('<textarea rows="1" cols="80">').addClass('object');
            this.element.append(this.object);

            var notepad = this.getNotepad();
            this.object.autocomplete({
                source: function(term,callback) {
                    notepad.endpoint.getSubjectsLabelsByLabel(term.term,callback);
                },
                select: function(event, ui) {
                    var line = $(event.target).parent('li').data('line');
                    line.setUri(ui.item.value);
                    line.setLineLiteral(ui.item.label);
                    event.preventDefault();  // prevent the default behaviour of replacing the text with the value
                }
            });
            
            // Create the children container
            $('<ul>').appendTo(this.element).container();
        },      
        _destroy : function() {
            this.element.removeClass("line").removeAttr('about');
            this.object.unbind().remove();
            this.predicate.remove();
            this.subject.unbind().remove();
        }
    });
    
    $.widget("notepad.notepad", {
        // A notepad defines
        //  - a toplevel URI
        //  - a list of lines

        // TODO: this should instead be expressed in RDF as a collection of 'predicate-uri', 'rdfs:label', '<label>'
        _predicateMap : {
            'subclass' : 'rdfs:Class',
            'more specifically' : 'rdfs:Class',
            'part' : '-log:implies',
            'requires': '-log:implies',
            'source' : 'rdf:source',
            'synonym' : 'owl:sameAs',
            'i.e.' : 'owl:sameAs',
            'e.g.' : 'owl:sameAs',
            'member': 'rdfs:member',
            'sequence' : 'rdf:Seq',
            'to' : 'log:implies',
            'more generally' : '-rdfs:Class',
            'named' : 'rdfs:label',
        },

        options : {},
        endpoint: undefined,
        
        getUri: function() {
            return this.element.attr('about');
        },
        _setUri: function(uri) {
            this.element.attr('about',uri);
        },
        setUri: function(uri) {
            throw "Nope";
            if (this.getUri() !== undefined && this.getList()) {
                // changing the top-level URI clears the list
                this._initList();
            }
            this._setUri(uri);
        },
        
        getList: function() { // TODO: consider renaming to getContainer
            return this.element.children('ul').data('container');  // TODO: this may throw
        },
        getLines: function() {
            return this.getList().getLines();
        },

        // Set up the widget
        _create : function() {
            var self = this;

            this.element.addClass("notepad");

            this.endpoint = undefined; // Test with new FusekiEndpoint('http://localhost:3030');
            
            this._setUri(this._getNewUri());

            var ul = $('<ul>').appendTo(this.element).container();  // Create an empty container
            this.getList().appendLine();  // Start with one empty line
            
            this.element.on("keydown.notepad", function(event) {
                if($(event.target).data('autocomplete').menu.active) {
                    // The autocomplete menu is active, do nothing here
                    return;
                }

                var keyCode = $.ui.keyCode;
                switch (event.keyCode) {
                case keyCode.ENTER:
                case keyCode.NUMPAD_ENTER:
                    return self._return(event);
                    break;
                case keyCode.UP:
                    return self._up(event);
                    break;
                case keyCode.DOWN:
                    return self._down(event);
                    break;
                case keyCode.TAB:
                    if (!event.shiftKey) {
                        self._indent(event);
                    } else {
                        self._unindent(event);
                    }
                    return false;
                    break;
                default:
                    break;
                }
            });
                        
            // Uncomment to disable autocomplete based on the predicate
            // this.element.on("focusin focus", function(event) '{
            //  var el = $(event.target);
            //  if (el.hasClass('object')) {
            //      self._updateObjectAutocomplete(el.parent('li'));
            //  }
            // });
            
        },
        _destroy : function() {
            this.element.removeClass("notepad").removeAttr('about').unbind();
            this.element.children().remove();
        },
        
        // TODO: not currently in use
        _updateObjectAutocomplete : function(line) {
            var predicate = line.children('.predicate').val();
            var object = line.children('.object');
            if (predicate === 'more generally') {
                object.autocomplete('option', 'disabled', false);
            } else {
                object.autocomplete('option', 'disabled', true);
            }
        },

        _up : function(event) {
            var target = $(event.target);
            var li = target.parent('li');
            // Get the list of lines
            var lines = li.data('line').notepad.element.find('li');
            var i;
            for (i=0; i<lines.length; i++) {
                if (lines[i] == li[0]) {
                    break;
                }
            }
            if (i>0) {
                $(lines[i-1]).data('line').focus();
            }
            return false;   // Prevent default behaviour
        },
        _down : function(event) {
            var target = $(event.target);
            var li = target.parent('li');

            // Get the list of lines
            var lines = li.data('line').notepad.element.find('li');
            var i;
            for (i=0; i<lines.length; i++) {
                if (lines[i] == li[0]) {
                    break;
                }
            }
            if (i<lines.length-1) {
                $(lines[i+1]).data('line').focus();
            }
            return false;   // Prevent default behaviour
        },
        _return : function(event) {
            var target = $(event.target);
            var li = target.parent('li');
            var ul = li.parent('ul');
            
            var newLine;
            if (target.caret() == 0) {
                newLine = li.data('line').insertLineBefore();
                li.focus();         // Focus on the line that moved down
            } else {
                newLine = li.data('line').insertLineAfter();
                newLine.focus();
            }
            
            return false;
        },
        _indent : function(event) {
            if ($(event.target).hasClass('predicate')) {
                $(event.target).parent('li').find('.object').focus();
                return false;
            }
            var li = $(event.target).parent('li');

            // Prevent moving if the current line has no predecessor
            var newParentLine = li.prev();
            if (!newParentLine.length) {
                return false;
            }

            // Move current line to newParent
            newParentLine.data('line').appendLine(li);

            li.find('.object').focus();
            return false;
        },
        _unindent : function(event) {
            if ($(event.target).hasClass('object')) {
                $(event.target).parent('li').find('.predicate').focus();
                return false;
            }
            
            var li = $(event.target).parent('li');

            // Determine the new location
            var newPredecessor = li.parent('ul').parent('li');

            // Prevent moving if we couldn't find the new parent
            if (!newPredecessor.length) {
                return false;
            }

            // Move current line to parent
            li.insertAfter(newPredecessor);
        },

        getRdf : function() {
            // TODO: decide whether to
            //   a) store RDF in data in addition to storing it in the DOM?
            //     => requires: update RDF that is stored in data
            //   b) store only RDF that is not stored in the DOM?
            //     => requires: remove any RDF that is stored in DOM
            //   c) not store any RDF that isn't displayed
            //     => requires: provide a callback to get more RDF  (getRdfBySubject)
            // TEST: c)
            throw "not yet implemented";
        },
        getRdfBySubject: function(uri, callback) {
            this.endpoint.getRdfBySubject(uri, callback);
        },
        setRdf: function(triples) {
            this.getList()._updateFromRdf(triples);
        },
        
        _getNewUri: function() {
            return new Resource(":"+guidGenerator());
        },
        _getBlankUri: function() {
            return new Resource("[]");
        },

        triples: function(){
            return this.getList().triples();
        },
        contains: function(triple) {
            var triples = this.triples();
            for(var i=0; i<triples.length; i++) {
                if (triple.equals(triples[i])) {
                    return true;
                }
            }
            return false;
        }
    });

    triplesToDatabank = function(triples) {
        var databank = $.rdf.databank({namespaces: DEFAULT_NAMESPACES});
        $.each(triples, function(index,triple) {
            var t = $.rdf.triple(
                triple.subject.toRdfResource(),
                triple.predicate.toRdfResource(),
                triple.object.toRdfResource()
            );
            databank.add(t);
        });
        return databank;
    };

}(jQuery));