(function($, undefined) {

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
