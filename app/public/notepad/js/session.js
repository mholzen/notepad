(function($, undefined) {

    $.fn.closestSession = function() {
        return this.parents('.notepad-session').andSelf().filter('.notepad-session').data("notepadSession");
    }

    $.widget("notepad.session", {
        options: {
            triples: null,  // function returning triples
        },
        _create: function() {
            this.element.addClass('notepad-session');
            this.reset();
        },
        _destroy: function() {
            this.element.removeClass('notepad-session');
        },
        reset: function() {
            this._loaded = null;
        },
        loaded: function(triple) {
            if (!this._loaded) {
                this._loaded = new Triples();
            }
            if (triple === undefined) {
                return this._loaded;
            }
            this._loaded.add(triple);
            return this._loaded;
        },
        unloaded: function(triples) {
            if (!this._loaded) {
                return;
            }
            this._loaded = this._loaded.minus(triples);
            return this._loaded;
        },
        canSave: function(triple) {
            return (triple.predicate != 'nmo:htmlMessageContent' && triple.predicate != 'nmo:plainTextMessageContent');
            // could be generalized to excluding any objects that cannot be edited by the current notepad (images, audio, svg, ...)
        },
        added: function() {
            return this.triples().minus( this.loaded() ).filter(this.canSave);
        },
        removed: function() {
            return this.loaded().minus( this.triples() ).filter(this.canSave);
        },
        _triples: function() {
            // should be overridden
            if (this.options.triples) {
                return this.options.triples.call();
            }
        },
        triples: function() {
            var triples = new Triples();
            triples.add(this._triples());

            var containers = this.element.find(":notepad-container").andSelf().filter(':notepad-container');

            var childTriples = _.reduce(containers, function(triples, container) {
                return triples.add($(container).data('notepadContainer').triples());
            }, toTriples());

            triples.add(childTriples);
            return triples;
        }
    });

}(jQuery));
