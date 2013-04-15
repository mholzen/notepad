(function($, undefined) {

    // consider: using the line widget with {objectWidget: readonly-label, predicateWidget: readonly-forward-label}
    $.widget("notepad.reverseLine", {
        _line: function() {
            return this.element.closest(':notepad-line').data('notepadLine');
        },
        _subject: function() {
            return $("<div>")
                .attr('about', this._line().getUri())
                .endpoint({endpoint: this.element.findEndpoint()})
                .urilabel();
        },
        _predicate: function() {

            // should be:
            // (this._line().options.forwardLabel)({edit: false, about: uri})

            var template = this._line().getDirection() === 'forward' ?
                '{{#notepad:inverseLabel}}<div class="notepad-literal notepad-predicate" rel="notepad:inverseLabel">{{xsd:string}}</div>{{/notepad:inverseLabel}}' :
                '{{#rdfs:label}}<div class="notepad-literal notepad-predicate" rel="rdfs:label">{{xsd:string}}</div>{{/rdfs:label}}' ;

            return $('<div class="notepad-predicate-label">')
                .attr('about', this._line().getContainerPredicateUri())
                .endpoint({endpoint: this.element.findEndpoint()})
                .urilabel({template: template});
        },
        _object: function() {
            return $('<span>')
                .attr('about', this._line().getContainerUri())
                .endpoint({endpoint: this.element.findEndpoint()})
                .urilabel();
        },

        _list: function() {
            return this._line()
                ? $("<ul>").append(this._predicate(), this._object()) 
                : undefined;
        },
        _create: function() {
            // consider: send triples to a "read only urilabel" widget
            this.element.append(this._subject());
            this.element.append(this._list());
        }
    });

    function externalUri(uri) {
        // consider: use namespaces as well
        if ( ! uri.toString().contains('localhost') && uri.indexOf(':') !== 0 ) {
            return uri;
        }
    }

    // This widget displays a link next to the literal, if it contains a recognizable URL to an external resource
    // It could also be used to add an entry in the autocomplete menu, to indicate this URL could be fetched.
    $.widget("notepad.externalLink", {
        _create: function() {
            if (! this._source() ) {  // requires a urilabel
                throw new Error("cannot create an externalLink without a urilabel");
            }
            // this widget adds meta data to the source
            this._source().element.meta({meta: this._meta.bind(this)});         // should: add if there is already a meta element
            
            this._update();
            var link = this;
            this._source().element.on("urilabelurichange", this._update.bind(this));

            // keypress does not cover all changes (eg, paste or even BACKSPACE)
            // consider: textinput?
            this._source().element.on("keyup", function(event) {
                link._update();
                $("#menu").data('notepadMenu2')._update();          // should: be an event handler
            });
        },

        _source: function() {
            return this.element.closest(':notepad-urilabel').data('notepadUrilabel');
        },
        _uri: function() {
            var source = this._source();
            if (! source) {
                return;
            }
            var label = source.getLabel();
            if (!label) {
                return;
            }

            var uri = toResource(label.toString());
            if ( !uri.isUri() ) {
                uri = source.getUri();
            }
            uri = externalUri(uri);
            if (! uri) {
                return;
            }
            return uri;
        },
        _update: function() {
            var uri = this._uri();
            if (uri) {
                this.element.html( $('<a target="_blank">').attr('href', uri).append('<img src="../external/images/glyphicons/glyphicons_050_link.png"/>') );
            } else {
                this.element.html( "" );
            }
        },
        _meta: function() {
            var uri = this._uri();
            if (! uri ) {
                return;
            }
            // Represent availble operations using triples
            // notepad:6262ff85-39b3-bd65-565d-a2eccdaffdc0
            return toTriples(toTriple("javascript:urilabel.setUri('"+uri+"')", 'rdfs:label', "Fetch URL..."));
        },
        
        // should: provide this as a menu function
        fetchURL: function() {
            this.setUri();
            // should: load the URI
        },

        setUri: function() {
            if (this._uri()) {
                return this._source().setUri(this._uri());
            }
        },

    });

}(jQuery));
