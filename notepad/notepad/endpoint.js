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

        options: {
            endpoint: 'some clever default'
        },

        _setOption: function(key, value) {
            this._super(key, value);        // We have jquery-ui 1.9
        },
        _create: function() {
            this.element.addClass("notepad-endpoint");
        },
        _destroy: function() {
            this.element.removeClass("notepad-endpoint");
        },
        getEndpoint: function() {
            return this.options.endpoint;
        }
    });

    $.fn.findEndpoint = function() {
        var element = this.closest(":notepad-endpoint");
        if (element.length === 0) {
            return;
            //throw new Error("cannot find an endpoint");
        }
        return element.data('endpoint').getEndpoint();
    }



}(jQuery));
