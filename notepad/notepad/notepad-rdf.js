(function($, undefined) {

    $.fn.notepad = $.fn.notepad || {};

    var DEFAULT_NAMESPACES = {
        xsd:  "http://www.w3.org/2001/XMLSchema#",
        rdf:  "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
        rdfs: "http://www.w3.org/2000/01/rdf-schema#",
        owl:  "http://www.w3.org/2002/07/owl#",
    };

    function guidGenerator() {
        var S4 = function() {
            return (((1+Math.random())*0x10000)|0).toString(16).substring(1);
        };
        return (S4()+S4()+"-"+S4()+"-"+S4()+"-"+S4()+"-"+S4()+S4()+S4());
    }

    // Resource and Triple abstract the interface between Notepad and an RDF library
    // TODO: "import Resource, Triple"
    _stringToRdfResource = function(value) {
        if (value.indexOf('[]')==0) {
            return $.rdf.blank('_:'+guidGenerator());
        }
        if (value.indexOf('_:')==0) {
            return $.rdf.blank(value);
        }
        if ( value.indexOf('http://') == 0 || value.indexOf('file://') == 0) {
            // TODO: make more specific
            return $.rdf.resource('<' + value.toString() + '>', {namespaces: DEFAULT_NAMESPACES} );
        }
        if ( value.indexOf(':') == 0) {
            return $.rdf.resource('<' + $.uri.base() + '#' + value.toString().slice(1) + '>' );
        }
        if ( value.indexOf(':') != -1) {
            // TODO: make more specific
            return $.rdf.resource(value.toString(), {namespaces: DEFAULT_NAMESPACES} );
        }        
        return $.rdf.literal('"'+value.toString()+'"');
    };
    _fusekiToRdfResource = function(value) {
        if (value.type == 'bnode' && value.value ) {
            return $.rdf.blank("_:" + value.value);
        }
        if (value.type == 'uri' && value.value ) {
            return $.rdf.resource('<' + this._string + '>', {namespaces: DEFAULT_NAMESPACES} );
        }
        if (value.type == 'literal' && value.value ) {
            return$.rdf.literal('"'+value.value.toString()+'"');
        }
        throw "cannot create an RDF resource from a Fuseki object";
    };
    
    Resource = function(value) {
        if ( value.type && value.value ) {
            this.resource = _fusekiToRdfResource(value);
        } else if ( value.resource ) {
            this.resource = value.resource;
        } else if ( value.toString() ) {
            this.resource = _stringToRdfResource(value.toString());
        }
        if ( value.element ) {
            this.element = value.element;
        }
        return this;
    };
    Resource.prototype = {
        isBlank: function() {
            return (this.resource.type == 'bnode');
        },
        isUri: function() {
            return (this.resource.type == 'uri');
        },
        isLiteral: function() {
            return (this.resource.type == 'literal');
        },
        toString: function() {
            if (this.isBlank()) {
                return this.toSparqlString();
            }
            if (this.isUri()) {
                try {
                    var curie = $.createCurie(this.resource.toString().slice(1,-1), {namespaces: DEFAULT_NAMESPACES, reservedNamespace: $.uri.base()+'#' });
                    return curie;
                } catch (err) {
                    return this.resource.toString().slice(1,-1); // Remove encapsulating angle brackets
                }
            }
            if (this.isLiteral()) {
                return this.toSparqlString().slice(1,-1); // Remove encapsulating double quotes ""
            }
        },
        toSparqlString: function() {
            return this.resource.toString();
        },
        toRdfResource: function() {
            return this.resource;
        },
        equals: function(resource) {
            return this.toString() === resource.toString();
        },
    };

    $.fn.notepad.getNewUri = function() {
        return new Resource(":"+guidGenerator());
    };

    Triple = function(subject,predicate,object,operation) {
        this.subject = new Resource(subject);
        this.predicate = new Resource(predicate);
        this.object = new Resource(object);
        this.operation = operation || "update";
    };
    Triple.prototype = {
        toString: function() {
            return this.subject.toSparqlString()+' '+this.predicate.toSparqlString()+' '+this.object.toSparqlString()+' .';
        },
        equals: function(triple) {
            return this.subject.equals(triple.subject) && this.predicate.equals(triple.predicate) && this.object.equals(triple.object);
        },
    };

    Triples = (function() {
        var methods = {
            update: {
                value: function() {
                    return $.grep(this, function(triple) { return triple.operation == "update"; });
                }
            },
            delete: {
                value: function() {
                    return $.grep(this, function(triple) { return triple.operation == "delete"; });
                }
            },
            updateSparql: { value: function() {
                var sparql = "";
                var rdfsLabel = '<http://www.w3.org/2000/01/rdf-schema#label>';

                // Overwrite all triples that are receiving new rdfs:label triples
                var labelTriples = $.grep(this.update(), function(triple) {
                    return triple.predicate.toString() == rdfsLabel || triple.predicate.toString() == "rdfs:label"
                });
                var labelUris = $.map(labelTriples, function(triple) { 
                    return triple.subject;
                });

                if (labelUris.length) {
                    sparql = sparql + "DELETE { ?s " + rdfsLabel + " ?o } WHERE {\n"+
                        "   ?s "+ rdfsLabel + " ?o\n" +
                        "   FILTER (?s in ( " + labelUris.join(",\n") + ") )\n" + 
                        "} \n";
                }
                var updateTriples = this.update();
                if (updateTriples.length) {
                    sparql = sparql + "INSERT DATA {\n" + this.update().join(" \n") + "\n}";    
                }
                return sparql;
            } },
            deleteSparql: { value: function() {
                var triples = $.each(this.delete(), function(e) { return e.toString().replace(/\\/g,''); }).join(" \n");
                if (triples.length == 0) {
                    return undefined;
                }
                return "DELETE DATA { " + triples + " }";
            } },
            sparql: { value: function() {
                var sparql = [];
                var deleteSparql = this.deleteSparql();
                if (deleteSparql) {
                    sparql.push(deleteSparql);
                }
                var updateSparql = this.updateSparql();
                if (updateSparql) {
                    sparql.push(updateSparql);
                }
                return sparql;
            } },
        };

        return function() {
            var arr = makeSubArray(methods);
            if (arguments.length === 1) {
                arr.length = arguments[0];
            } else {
                arr.push.apply(arr, arguments);
            }
            return arr;
        };
    })();

}(jQuery));
