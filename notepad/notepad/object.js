(function($, undefined) {

    function predicateSelector(predicate) {
        return predicate ?
            '[rel="'+predicate+'"],[rev="'+predicate+'"]' :
            '[rel],[rev]';
    }

    $.fn.closestPredicate = function(predicate) {
        return this.closest(predicateSelector(predicate));
    }

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
        setLiteral: function(literal) {
            return this.literal().setLiteral(literal);
        },
        uri: function() {
            if (!this.isUri()) {
                this.element.urilabel({templateReceived: function(triples) {
                    // update menu
                    $("#menu .templates").attr('about', $.notepad.getNewUri());
                    $("#menu .templates").container().data('notepadContainer').addSubjects(urilabel.templates());
                }});
            }            
            return this.element.data('notepadUrilabel');
        },
        setUri: function(uri) {
            return this.uri().setUri(uri);
        },
        setObject: function(object) {
            if (typeof object === "string") {
                object = toResource(object);
            }
            if (object.isLiteral()) {
                this.literal().setLiteral(object);
                return this;
            } else if ( object.isUri() || object.isBlank() ) {
                this.uri().setUri(object);
                return this;
            }
            throw new Error("cannot set an object that is neither a literal or a URI");
        },
        update: function(triple) {
            // could verify the triple is related
            this.setObject(triple.object);
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
            var element = this.element.closestPredicate();
            var predicate = element.data('notepadPredicate');
            if (predicate) {
                return predicate;
            }
            return element.predicate({label: null}).data('notepadPredicate');
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
            var object = object || this.getObject();
            if (!object) {
                return undefined;
            }
            if (this.getPredicate().isForward()) {
                return new Triple(subject, predicate, object);    
            } else {
                if (object.isLiteral()) {
                    throw new Error("cannot get a backward triple with a literal as subject");    
                }
                return new Triple(object, predicate, subject);
            }
        },
        triples: function() {
            var triples = new Triples();
            triples.add(this.triple());
            if (this.isUri()) {
                triples.add(this.uri().triples());
            }
            return triples;
        },

        triplesInDomPath: function() {
            var triples = new Triples();
            triples.add(this.triple());
            var parentNode = this.element.parent().closest(":notepad-container");
            if (parentNode.length) {
                triples.add(parentNode.data('notepad-container').triplesInDomPath());
            }
            return triples;
        },

        focus: function() {
            this.element.find('[contenteditable="true"]:eq(0)').focus();
        },


        // Set up the widget
        _create: function() {
            var about = this.element.attr('about');
            var isPredicate = this.element.attr('rel') || this.element.attr('rev');
            if (about && !isPredicate) {
                this.element.urilabel();
            } else {
                this.element.literal();
            }
        },
        _destroy : function() {
        },

    });

}(jQuery));
