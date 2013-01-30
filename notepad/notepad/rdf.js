(function($, undefined) {

    $.notepad = $.notepad || {};

    $.notepad.uri = function() {
        return $.uri.base().toString().replace(/#.*$/,'');
    }

    var namespaces = {
        xsd:        "http://www.w3.org/2001/XMLSchema#",
        rdf:        "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
        rdfs:       "http://www.w3.org/2000/01/rdf-schema#",
        owl:        "http://www.w3.org/2002/07/owl#",
        ex:         "http://example.com/#",
        nmo:        "http://www.semanticdesktop.org/ontologies/nmo/#",
        notepad:    "http://www.vonholzen.org/instruct/notepad/#",
        sp:         "http://spinrdf.org/sp#",
        dc:         "http://purl.org/dc/elements/1.1/#",
        '':         $.notepad.uri() + '#'
    };
    $.notepad.namespaces = namespaces;

    // Add namespaces to support RDFa gleaners
    for (var abbr in $.notepad.namespaces) {
        $('html').attr('xmlns' + (abbr.length?':':'') + abbr, $.notepad.namespaces[abbr]);
    }

    // TODO: move somewhere general (req: figure out JS dependencies)
    String.prototype.contains = function(text) {
        return (this.indexOf(text)!=-1);
    };

    _.mixin(_.str.exports());

    function guidGenerator() {
        var S4 = function() {
            return (((1+Math.random())*0x10000)|0).toString(16).substring(1);
        };
        return (S4()+S4()+"-"+S4()+"-"+S4()+"-"+S4()+"-"+S4()+S4()+S4());
    }

    // Resource and Triple abstract the interface between Notepad and an RDF library
    _stringToRdfResource = function(value) {
        if (value.indexOf('[]')==0) {
            return $.rdf.blank('_:'+guidGenerator());
        }
        if (value.indexOf('_:')==0) {
            
            // Replace ':' and '-' with underscore because Fuseki generates yet does not accept such blank nodes.
            // dev:techdebt We really never have to write blank nodes back to a triplestore though.  We need this because we use a temporary fuseki graph
            // as a way to implement SPARQL in Javascript
            value = '_:' + value.slice(2).replace(/(:|-)/g, '_'); 

            return $.rdf.blank(value);
        }
        if ( value.indexOf('http://') == 0 || value.indexOf('file://') == 0 || value.indexOf('urn:') == 0) {
            // TODO: make more specific
            return $.rdf.resource('<' + value.toString() + '>', {namespaces: namespaces} );
        }
        if ( value.indexOf(':') == 0) {
            return $.rdf.resource('<' + $.notepad.uri() + '#' + value.toString().slice(1) + '>' );
        }
        if ( value.indexOf(':') > 0) {
            try {
                return $.rdf.resource(value.toString(), {namespaces: namespaces} );
            }
            catch(error) {
                // We couldn't make it a URI, let's make it a Literal
            }
        }
        return $.rdf.literal('"' + value.toString().replace(/"/g, '\\"') + '"');
    };
    _fusekiToRdfResource = function(binding) {
        if(!binding.value) {
            throw new Error("missing 'value' from a Fuseki binding");
        }
        if (binding.type == 'bnode') {
            return $.rdf.blank("_:" + binding.value);
        }
        if (binding.type == 'uri') {
            return $.rdf.resource('<' + binding.value + '>', {namespaces: namespaces} );
        }
        if (binding.type == 'literal') {
            return $.rdf.literal('"' + binding.value.toString().replace(/"/g, '\\"') + '"');
        }
        throw "unknown type "+binding.type;
    };
    
    Resource = function(value) {
        if (value === undefined) {
            throw new Error("cannot create a resource with an undefined value");
        }
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
        if (this.resource === undefined) {
            throw new Error("cannot determine a value for a resource");
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
        indexOf: function(v) {
            return this.toString().indexOf(v);
        },
        toString: function() {
            if (this.isBlank()) {
                return this.toSparqlString();
            }
            if (this.isUri()) {
                try {
                    var curie = $.createCurie(this.resource.toString().slice(1,-1), {
                        namespaces: namespaces,
                        reservedNamespace: $.notepad.uri()+'#'
                    });
                    return curie;
                } catch (err) {
                    return this.resource.toString().slice(1,-1); // Remove encapsulating angle brackets
                }
            }
            if (this.isLiteral()) {
                return this.resource.toString().slice(1,-1).replace(/\\"/g, '"'); // Remove encapsulating double quotes ""
            }
        },
        toURL: function() {
            return this.resource.toString().slice(1,-1);
        },
        toSparqlString: function() {
            if ( this.isLiteral() ) {
                return this.resource.toString();  // BUG
            }
            return this.resource.toString();
        },
        toRdfResource: function() {
            return this.resource;
        },
        equals: function(resource) {
            return this.toString() === resource.toString();
        },
    };

    $.notepad.getNewUri = function() {
        return new Resource(":"+guidGenerator());
    };

    $.notepad.toUri= function(value) {
        if (value === undefined) { return undefined; }
        var resource = new Resource(value);
        return resource.toString();
    };

    toTriple = function(subject,predicate,object,operation) {
        if (subject === undefined || predicate === undefined || object === undefined || object.length === 0) {
            return undefined;
        }
        return new Triple(subject,predicate,object,operation);
    };

    Triple = function(tripleOrSubject,predicate,object,operation) {
        if (tripleOrSubject === undefined) {
            throw new Error("cannot create a triple from an undefined value");
        }
        var subject;
        if (tripleOrSubject.subject !== undefined) {
            subject = tripleOrSubject.subject;
            predicate = tripleOrSubject.property || tripleOrSubject.predicate;
            object = tripleOrSubject.object;
        } else {
            subject = tripleOrSubject;
        }

        this.subject = new Resource(subject);
        this.predicate = new Resource(predicate);
        this.object = new Resource(object);
        this.operation = operation || "update";
        if ( this.subject === undefined ) {
            throw new Error("triple with no subject");
        }
        if ( this.predicate === undefined ) {
            throw new Error("triple with no predicate");
        }
        if ( this.object === undefined ) {
            throw new Error("triple with no object");
        }
    };
    Triple.prototype = {
        toString: function() {
            var object = this.object.toString(); 
            if (this.object.isLiteral()) {
                object = '"' + object + '"';
            }
            return this.subject.toString()+' '+this.predicate.toString() + ' ' + object + ' .';
        },
        toPrettyString: function() {
            return this.toString();
        },
        toSparqlString: function() {
            return this.subject.toSparqlString()+' '+this.predicate.toSparqlString()+' '+this.object.toSparqlString()+' .';
        },
        equals: function(triple) {
            if ( triple === undefined ) {
                return false;
            }
            if ( triple.subject === undefined ) {
                throw new Error("triple with no subject");
            }
            if ( triple.predicate === undefined ) {
                throw new Error("triple with no predicate");
            }
            if ( triple.object === undefined ) {
                throw new Error("triple with no object");
            }
            return this.subject.equals(triple.subject) && this.predicate.equals(triple.predicate) && this.object.equals(triple.object);
        },
    };

    Triples = (function() {
        var methods = {
            add: { value: function(value) {
                if (value === undefined) { return; }
                if (value instanceof Array) {
                    $.merge(this, value);
                } else if (value instanceof $.rdf.databank) {
                    var triples = this;
                    value.triples().each(function(i,rdftriple) {
                        var triple = new Triple(rdftriple);
                        triples.add(triple);
                    });
                } else if (value instanceof Triple) {
                    this.push(value);
                } else if (value instanceof Object) {
                    var json = value;
                    var databank = $.rdf.databank();
                    databank.load(json);
                    return this.add(databank);
                } else {
                    this.push(value);
                }
            } },
            update: { value: function() {
                return this.filter(function(triple) { return triple.operation == "update"; });
            } },
            delete: { value: function() {
                return this.filter(function(triple) { return triple.operation == "delete"; });
            } },
            insertSparql: { value: function() {
                var sparql = "";
                var updateTriplesSparql = _.map( this, function(triple) { return triple.toSparqlString(); } );
                if (updateTriplesSparql.length > 0) {
                    sparql = "INSERT DATA {\n" + updateTriplesSparql.join(" \n") + "\n}";    
                }
                return sparql;
            } },
            deleteSparql: { value: function() {
                var sparql = "";
                var updateTriplesSparql = _.map( this, function(triple) { return triple.toSparqlString(); } );
                if (updateTriplesSparql.length > 0) {
                    sparql = "DELETE DATA {\n" + updateTriplesSparql.join(" \n") + "\n}";    
                }
                return sparql;
            } },

            updateSparql: { value: function() {
                var sparql = "";
                // var rdfsLabel = '<http://www.w3.org/2000/01/rdf-schema#label>';

                // // Overwrite all triples that are receiving new rdfs:label triples
                // var labelTriples = $.grep(this.update(), function(triple) {
                //     return triple.predicate.toString() == rdfsLabel || triple.predicate.toString() == "rdfs:label"
                // });
                // var labelUris = $.map(labelTriples, function(triple) { 
                //     return triple.subject;
                // });

                // if (labelUris.length) {
                //     sparql = sparql +
                //         "DELETE { ?s " + rdfsLabel + " ?o } WHERE {\n"+
                //         "   ?s "+ rdfsLabel + " ?o\n" +
                //         "   FILTER (?s in ( " + labelUris.join(",\n") + ") )\n" + 
                //         "} \n";
                // }
                var updateTriplesSparql = _.map( this, function(triple) { return triple.toSparqlString(); } );
                var updateTriplesSparql = _.map( this.update(), function(triple) { return triple.toSparqlString(); } );
                if (updateTriplesSparql.length) {
                    sparql = sparql + "INSERT DATA {\n" + updateTriplesSparql.join(" \n") + "\n}";    
                }
                return sparql;
            } },
            _deleteSparql: { value: function() {
                var triples = $.each(this, function(e) { return e.toString().replace(/\\/g,''); }).join(" \n");
                // var triples = $.each(this.delete(), function(e) { return e.toString().replace(/\\/g,''); }).join(" \n");
                if (triples.length == 0) {
                    return undefined;
                }
                return "DELETE DATA { " + triples + " }";
            } },
            contains: { value: function(triple) {
                for(var i=0; i<this.length; i++) {
                    if (triple.equals(this[i])) {
                        return true;
                    }
                }
                return false;
            } },
            filter: { value: function(f) {
                var filteredTriples = new Triples();
                $.merge(filteredTriples, _.filter(this, f));
                return filteredTriples;
            } },
            triples: { value: function(subject, predicate, object) {
                return this.filter(function(triple) {
                    return (subject == undefined || triple.subject.equals(subject)) &&
                        (predicate == undefined || triple.predicate.equals(predicate)) &&
                        (object == undefined || triple.object.equals(object));
                });
            } },
            toDatabank: { value: function() {
                var databank = $.rdf.databank([], {namespaces: namespaces });
                _.each(this.update(), function(t) {
                    databank.add(t.toSparqlString());
                });
                return databank;
            } },
            expresses: { value: function(triple) {
                var sameAsRuleset = $.rdf.ruleset([], { namespaces: namespaces });
                sameAsRuleset.add(['?u1 owl:sameAs ?u2'], '?u2 owl:sameAs ?u1');
                sameAsRuleset.add(['?s1 owl:sameAs ?s2', '?s1 ?p ?o'], '?s2 ?p ?o');
                sameAsRuleset.add(['?p1 owl:sameAs ?p2', '?s ?p1 ?o'], '?s ?p2 ?o');
                sameAsRuleset.add(['?o1 owl:sameAs ?o2', '?s ?p ?o1'], '?s ?p ?o2');
                var databank = this.toDatabank();
                sameAsRuleset.run(databank);
                var rdf = jQuery.rdf({ databank: databank });
                var matches = rdf.where(triple.toSparqlString());
                return (matches.length > 0);
            } },
            getLabels: { value: function(uri, callback) {
                var labels = this.filter(function(t) {
                    // filter by predicate and uri
                    return t.subject == uri && t.predicate == "rdfs:label";
                });
                if (callback) {
                    callback(labels);
                }
                return labels;
            } },
            getPredicatesLabelsByLabel: { value: function(label, callback) {
                log.debug("warn: getPredicatesLabelsByLabel on an endpoint of triples not implemented");
                var results = [];
                if (callback) {
                    callback(results);
                }
                return results;
            } },
            execute: { value: function(sparql, callback) {
                TempFusekiEndpoint("http://localhost:3030/test", this, function() {
                    this.execute(sparql, callback);
                })
            } },

            subjects: { value: function() {
                return _.map(this, function(triple) { return triple.subject; });
            } },
            objects: { value: function() {
                return _.map(this, function(triple) { return triple.object; });
            } },
            toPrettyString: { value: function() {
                return this.join("\n");
            } },
            toTurtle: { value: function() {
                return this.toDatabank()
                .dump({format: "text/turtle"})
                .replace(/ \. /g, " .\n")
                .replace(/ ; /g, " ;\n\t")
                .replace(/ , /g, " ,\n\t\t")
                .replace(/^@.*\n/mg, "");         // remove prefixes
            } },
            toSparqlString: { value: function() {
                return _.map(this, function(triple) { return triple.toSparqlString(); }).join("\n");
            } },
            minus: { value: function(triples) {
                var result = new Triples();
                result.add( this.toDatabank().except(triples.toDatabank()) );
                return result;
            } }
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

    toTriples = function(value) {
        var triples = new Triples();
        triples.add(value);
        return triples;
    }
    $.notepad.toTriples = toTriples;

}(jQuery));
