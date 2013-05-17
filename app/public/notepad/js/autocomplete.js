(function($, undefined) {

    function defaultWrapper(string) {
        return '<span class="highlight">' + string + '</span>';
    }

    function WordRegExp(words) {
        var nbsp = String.fromCharCode(160);
        words = words.replace(nbsp, ' ');

        this.words = words.split(/\W+/g);
    }
    WordRegExp.prototype = {
        regexp: function() {
            return new RegExp ( "(" + this.words.join(").*(") + ")", "i" );
        },
        wordMatchers: function() {
            return this.words.map(function (word) {
                // word = word.replace(/\(\)/g, "\$1");
                return new RegExp(word, "i");
            });
        },
        exec: function(string) {
            return this.regexp().exec(string);
        },
        highlight: function(input, wrapper) {
            wrapper = wrapper || defaultWrapper;
            return this.wordMatchers().reduce(function(result, wordMatcher) {
                var match = wordMatcher.exec(input);
                if (!match) {
                    return "";
                }
                var prefix = input.slice(0,match.index);
                var highlight = wrapper(match);
                input = input.slice(match.index + match[0].length);  // move input
                return result + prefix + highlight;
            }, "") + input;
        }
    }
    $.notepad.WordRegExp = WordRegExp;

    function triplesToBrowseResults(callback, matcher) {
        return function(triples) {

            console.log(triples.pp());

            // get a map of graphs by subjects
            var graphs = _.reduce(triples, function(memo, triple) {
                memo[triple.subject] = (memo[triple.subject] || new Triples()).add(triple);
                return memo;
            }, {});

            var results = triples.triples(undefined, "inst:reason").map( function(solution) {
                var label = solution.object.toString();
                var highlighted = matcher.highlight(label);
                return {label:highlighted, value: graphs[solution.subject]}
            });

            // Sort by label length
            results = _.sortBy(results, function(obj) { return obj.label.length; });

            // We're done
            callback(results);
        }
    }

    $.widget("notepad.autocomplete2", $.ui.autocomplete, {

        options: {
            query: $.notepad.queries.find_match_by_path,

            minLength: 2,

            source: function(request,callback) {

                var matcher = new WordRegExp(request.term);
                var matchers = matcher.wordMatchers();
                matchers.forEach(function(match, index) {
                    match.index = index;
                });
                this.options.query.execute(this.element.findEndpoint(), {words: matchers, regexp: matcher.regexp().source}, triplesToBrowseResults(callback, matcher));
            },

            select: function(event, ui) {
                if (event.originalEvent) {
                    // Consume keyboard events that generateed this 'select' event
                    event.originalEvent.stopPropagation();
                }

                var triples = ui.item.value;
                var uris = triples.objects(undefined, "rdf:_0");
                if (uris.length != 1) {
                    throw new Error("cannot determine a single subject from a graph", uri);
                }
                var widget = $(event.target).closest(':notepad-urilabel').data('notepadUrilabel');
                widget.setUri(uris[0], triples);

                // mark any triples resulting from setUri as having been loaded by this session
                if (widget.getSession()) {
                    widget.getSession().loaded(widget.triples());
                }

                // should: focus on the source text element

                // this.focus();
                // doesn't work because the DOM element is re-created during update

                event.preventDefault();  // prevent the default behaviour of replacing the text with the value.  _updateRdf has taken care of it
            },

        },
        _setOption: function(key, value) {
            this._super(key, value);
            switch (key) {
                case 'query':
                break;
            }
        },
        _renderItem: function( ul, item ) {
          return $( "<li>" )
            .append( $("<a>").append(item.label).append( $('<span class="debug uri">').append('('+item.value.subject()+')') ) )
            .appendTo( ul );
        },

        // Set up the widget
        _create: function() {
            this._super();
        },
        _destroy : function() {
        },

    });

}(jQuery));
