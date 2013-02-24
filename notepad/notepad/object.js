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
