(function($, undefined) {

    ContainerChainEndpoint = function (container) {
        this.container = container;
    }
    ContainerChainEndpoint.prototype = {
        execute: function(command, callback) {

            var results = this.container.triples().execute(command, function(results) {
                if (results.length != 0) {
                    callback(results);
                }
            });

            // next endpoint
            var parentElement = this.container.element.parent();
            if (parentElement.length === 0) {
                log.warn('cannot find parent element to container');
                return;
            }
            var parentEndpoint = parentElement.findEndpoint();
            if (parentEndpoint === undefined) {
                log.warn('cannot find parent endpoint');
                return;
            }

            return parentEndpoint.execute(command, callback);
        }
    };

    ChainEndpoint = function (firstEndpoint, nextEndpoint) {
        this.firstEndpoint = firstEndpoint;
        this.nextEndpoint = nextEndpoint;
    }
    ChainEndpoint.prototype = {
        execute: function(command, callback) {
            var results = this.firstEndpoint.execute(command);
            if (results.length == 0) {
                return this.nextEndpoint.execute(command, callback);
            }
            if (callback) {
                callback(results);
            }
            return results;
        }
    };

    $.widget("notepad.endpoint", {

        // This widget manages the "notepad:endpoint" predicate under its DOM element

        // The 'uri' option sets the URI.  The endpoint defaults to constructing a FusekiEndpoint from the URI.
        // The 'endpoint' option can also be used to provide an endpoint object directly.
        // The 'display' control whether to display the endpoint label or not.

        options: {
            endpoint:   undefined,
            uri:        'http://localhost:3030/dev',
            display:    false
        },
        _setOption: function(key, value) {
            this._super(key, value);
            switch(key) {
                case 'uri':
                    this.options.endpoint = undefined;
                case 'endpoint':
                case 'display':
                    this.updateElement();
                break;
            }
        },
        _create: function() {
            this.updateElement();
        },
        _destroy: function() {
        },
        getLabel: function() {
            var elements = this.element.find('[about="notepad:endpoint"]');
            if (elements.length > 0) {
                return elements;
            }
            return $('<div about="notepad:endpoint">').appendTo(this.element);
        },
        getElement: function() {
            var elements = this.element.find('[property="notepad:endpoint"]');
            if (elements.length > 0) {
                return elements;
            }
            return $('<div property="notepad:endpoint">').appendTo(this.element);
        },
        updateElement: function() {
            if (this.options.display) {
                this.getElement().attr('content', this.options.uri); 
                this.getElement().find('[rel="rdfs:label"]').remove();
                this.getElement().append('<div rel="rdfs:label">'+this.getEndpoint()+'</div>');
            } else {
                this.getElement().remove();
            }
        },
        getEndpoint: function() {
            return this.options.endpoint || new FusekiEndpoint(this.options.uri);
        },
        setUriToFirstResponding: function(uris, callback) {
            var endpoint = this;

            var uri = uris.shift();

            var sparqlEndpoint = new FusekiEndpoint(uri);
            return sparqlEndpoint.canAnswer(function() {
                endpoint.option('uri', uri);
                if (callback) {
                    callback();
                }
            }).error(function() {
                if (uris.length === 0) {
                    endpoint.option('uri', undefined);
                    return;
                }
                return endpoint.setUriToFirstResponding(uris, callback);
            });
        },

        // This implementation has a bug. See test.
        setUriToFirstRespondingWithDeferred: function(uris) {
            console.log('setUri with ',uris);
            var endpoint = this;
            var uri = uris.shift();

            var sparqlEndpoint = new FusekiEndpoint(uri);
            return $.when( sparqlEndpoint.canAnswer() )
               .fail(function() {
                    console.log('setUri.fail with ',uris);
                    if (uris.length === 0) {
                        endpoint.option('uri', undefined);
                        return;
                    }
                    return endpoint.setUriToFirstResponding(uris);
                })
                .done(function() {
                    console.log('setUri.done ',uri);
                    endpoint.option('uri', uri);
                });
        },
    });

    $.fn.findEndpoint = function() {
        var element = this.closest(":notepad-endpoint");
        if (element.length === 0) {
            return;
        }
        return element.data('notepadEndpoint').getEndpoint();
    }

}(jQuery));
