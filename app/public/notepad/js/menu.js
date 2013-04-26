(function($, undefined) {

    // consider: make this a part of $.notepad.object
        // cons: what about empty collections?  Can't they publish meta data?
        // pros: all triples might have meta data.  Only triples can have meta data?
    $.widget("notepad.meta", {
        options: {
            meta: []
        },
        _create: function() {
            this.element.addClass('has-meta');
        },
        _destroy: function() {
            this.element.removeClass('has-meta');
        },
        add: function(value) {
            this.options.meta.push(value);
        },
        triples: function() {
            return this.options.meta.map(function(value) {
                return value();
            }).reduce(function(total, value) {
                return total.add(value)
            }, toTriples());
        }
    });

    var defaultMenu = toTriples(
        toTriple("javascript:notepad.open(line.getUri())",  'rdfs:label', '<span class="ui-icon ui-icon-arrowthick-1-e"></span>Open'),
        toTriple("javascript:line.showPredicate()",         'rdfs:label', "Show relationship"),
        toTriple("javascript:line.newPredicateUri()",       'rdfs:label', "New relationship"),
        toTriple("javascript:notepad.remove(line)",         'rdfs:label', "Remove line"),
        toTriple("javascript:notepad.delete(line)",         'rdfs:label', "Delete lines and contents")
    );

    $.widget("notepad.menu2", $.ui.menu, {

        options: {
            source: undefined,      // defaults to this.element
        },
        _setOption: function(key, value) {
            this._super(key, value);
            switch (key) {
                case 'source':
                    this._update();
                break;
            }
        },
        source: function() {
            return this.options.source || this.element;
        },
        _meta: function() {
            // walk up the DOM path (including self) and return _meta() triples
            var results = toTriples();

            console.log('[menu]','walking up DOM');
            this.source().parents(':notepad-meta').addBack(':notepad-meta').each(function(i,element) {
                var triples = $(element).data('notepadMeta').triples();
                results.add ( triples );
            });
            // should: filter for operations (maybe by filtering out triples who don't have javascript: as a scheme)
            return results;
        },
        _triples: function() {
            var triples = toTriples(defaultMenu);
            return triples.add(this._meta());
        },
        _template: function() {
            return this.options.template || ( this.options.template = this.element.find('.template').detach().removeClass('template') );
        },
        _update: function() {
            console.log('[menu]', 'updating itself');
            var template = this._template();
            if ( template.length === 0 ) {
                throw new Error("cannot _update without a template");
            }
            this.element.empty('li:not(.template)');
            var triples = this._triples();
            for (var i = 0; i < triples.length; i ++) {
                var triple = triples[i];
                var instance = template.clone().appendTo(this.element);
                var anchor = instance.find('a');
                anchor.attr('about', triple.subject);
                anchor.attr('rel', triple.predicate);
                anchor.html(triple.object.toString());
            }
            this.refresh();
        },
        _create: function() {
            this._template();
            this._super();
            this._update();
            this.element.on('menu2select', function(event, ui) {
                var uri = $(ui.item[0]).children('a[property="ui:select"]').attr('about');
                $("#control").hide().appendTo('body');                  // move the control out of the line to remove
                eval(uri);
            });

        },
        _destroy : function() {
        },

    });

}(jQuery));


