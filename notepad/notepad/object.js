(function($, undefined) {

    function predicateSelector(predicate) {
        return predicate ?
            '[rel="'+predicate+'"],[rev="'+predicate+'"]' :
            '[rel],[rev]';
    }

    $.fn.closestSubjectLocation = function(uri) {
        var selector = uri ? '[about='+uri+']' : '[about]';
        return this.closest(selector);
    }

    $.fn.closestSubjectUri = function(uri) {
        var location = this.closestSubjectLocation(uri);
        if ( !location.length ) {
            return;
        }
        return toResource(location.attr('about'));
    }

    $.fn.closestPredicate = function(predicate) {
        return this.closest(predicateSelector(predicate));
    }

    $.fn.findSubjects = function(subject) {
        var selector = subject ? '[about="'+subject+'"]' : '[about]';
        var children = this.find(selector);
        var self = this.filter(selector);
        return self.add(children);
    }

    $.fn.findPredicates = function(subject, predicate) {
        var subjects = this.findSubjects(subject);
        if ( this.closestSubjectLocation(subject).length ) {
            subjects = subjects.add(this);
        }

        var predicates = subjects.find(predicateSelector(predicate));
        predicates = predicates.add(this.filter(predicate));      // adding self if it matches

        if ( !subject ) {
            return predicates;
        }
        // Filter out any predicates that relate to another subject
        return predicates.filter(function(index, element) {
            return $(element).closestSubjectUri() === toResource(subject);       // consider: better impl?
        });
    }

    $.fn.findObjectLocations = function(triple) {
        var subject = triple ? triple.subject : undefined;
        var predicate = triple ? triple.predicate : undefined;

        // Not sure if the predicate is the location for an object widget
        // or whether I should find a .value or [content] element
        var predicates = this.findPredicates(subject, predicate);

        var objectSelector = '.value, [content], [about], :notepad-object';
        // var selector = ':notepad-object';
        // var selector = ':notepad-object, [content], [about]';



        // recursive?


        var selector = ':not('+objectSelector+') > ' + objectSelector + ',' + objectSelector;

        var objects = predicates.find(selector);
        var texts = predicates.filter(function(i,element) {
            // consider: use [content] in addition to text()
            return $(element).text().length > 0;
        });

        objects = objects.add(texts);
        return objects;
    }

    $.fn.findObjects = function(triple) {
        var elements = this.findObjectLocations(triple);
        var objects = elements.map(function(i,element) {
            return $(element).object().data('notepadObject');
        }).toArray();
        return objects;
    }

    $.fn.triples = function() {
        return toTriples(_.map(this.findObjects(), function(o) { return o.triple(); }));
    },


    $.widget("notepad.object", {

        // manages a literal or a uri

        options: { 
        },
        _setOption: function(key, value) {
            this._super(key, value);
            switch (key) {
                case 'something':
                break;
            }
        },

        getEndpoint: function () {
            return this.element.findEndpoint();
        },
        getNotepad: function() {
            return this.element.parents('.notepad').data("notepadNotepad");
        },

        isUri: function() {
            return (this.element.data('notepadUrilabel') != undefined);
        },
        isLiteral: function() {
            return (this.element.data('notepadLiteral') != undefined);
        },

        literal: function() {
            if (!this.element.data('notepadLiteral')) {
                if (this.element.data('notepadUrilabel')) {
                    this.element.data('notepadUrilabel').destroy()
                }
                this.element.literal();
            }
            return this.element.data('notepadLiteral');
        },
        uri: function() {
            if (!this.element.data('notepadUrilabel')) {
                if (this.element.data('notepadLiteral')) {
                    this.element.data('notepadLiteral').destroy()
                }
                this.element.urilabel();
            }
            return this.element.data('notepadUrilabel');
        },

        setObject: function(resource) {
            if (resource.isLiteral()) {
                this.literal().setLiteral(resource);
                return this;
            } else if (resource.isUri()) {
                this.uri().setUri(resource);
                return this;
            }
            throw new Error("cannot set an object that is neither a literal or a URI");
        },
        getObject: function() {
            if (this.isUri()) {
                return this.uri().getUri();
            }
            if (this.isLiteral()) {
                return this.literal().getLiteral();
            }
        },

        getPredicate: function() {
            return this.element.closest(":notepad-predicate").data('notepadPredicate');
        },
        getPredicateUri: function() {
            var predicate = this.getPredicate();
            return predicate ? predicate.getUri() : undefined;
        },
        getSubjectUri: function() {
            var predicate = this.getPredicate();
            return predicate ? predicate.getSubjectUri() : undefined;
        },
        triple: function(object) {
            var subject, predicate;

            if (! (predicate = this.getPredicateUri())) {
                return undefined;
            }
            if (! (subject = this.getSubjectUri())) {
                throw new Error("cannot find a subject URI but can find a predicate URI (ie. inconsistent state)");
            }
            // if (!this.getPredicate().isForward()) {
            //     throw new Error("cannot get a backward triple with a literal as subject");
            // }
            var object = object || this.getObject();
            if (!object) {
                return undefined;
            }
            return new Triple(subject, predicate, object);
        },
        triples: function() {
            var triples = new Triples();
            triples.add(this.triple());
            return triples;
        },
        literals: function() {
            return this.triples().literals();
        },
        focus: function() {
            this.element.find('[contenteditable="true"]:eq(0)').focus();
        },


        // getUri: function() {
        //     return this.element.attr('about');
        // },

        // // URI or Literal
        // isLiteral: function() {
        //     return (this.getUri() === undefined && this.getLiteral() !== undefined && this.getLiteral().length > 0);
        // },
        // getUriSparql: function() {
        //     return new Resource(this.getUri()).toSparqlString();
        // },
        // getUriElement: function() {
        //     if (this.options.uriElement) { return this.options.uriElement; }
        //     return this.element;
        // },
        // setUri: function(uri) {
        //     if (uri === undefined) {
        //         throw new Error("cannot set uri to undefined");
        //     }
        //     if (uri == this.getUri()) {
        //         return;
        //     }
        //     this._setUri(uri);
        //     this.uriChanged();

        //     // Trigger the event only after the label has displayed itself
        //     // so that: dependent DOM elements can avoid redisplaying a triple that is already displayed here

        //     // this._trigger("urichange"); // will trigger 'labelurichange'

        //     // Does this get captured by parent elements of this one, when this is triggered by a child.
        //     // It should *not* propagate to parents

        //     this.element.trigger("labelurichange"); // does not add widget prefix.
        // },
        // _setUri: function(uri) {
        //     this.getUriElement().attr(this.options.uriAttr, uri);
        //     return this;
        // },
        // _unsetUri: function() {
        //     this.getUriElement().removeAttr(this.options.uriAttr);
        // },
        // newUri: function() {
        //     this._setUri($.notepad.getNewUri());
        // },
        // ensureUri: function() {
        //     if (this.getUri() !== undefined) { return this.getUri(); }
        //     this._setUri($.notepad.getNewUri());
        // },

        // Set up the widget
        _create: function() {

            var about = this.element.attr('about');
            if (about) {
                this.element.urilabel();
            } else {
                this.element.literal();
            }
        },
        _destroy : function() {
        },

    });

}(jQuery));
