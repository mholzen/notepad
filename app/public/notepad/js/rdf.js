(function($, undefined) {

    $.notepad = $.notepad || {};

    $.notepad.getParameterByName = function(name) {
        name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
        var regexS = "[\\?&]" + name + "=([^&#]*)";
        var regex = new RegExp(regexS);
        var results = regex.exec(window.location.search);
        if(results == null)
            return "";
        else
            return decodeURIComponent(results[1].replace(/\+/g, " "));
    }

    $.notepad.uri = function() {
        return $.uri.base().toString().replace(/#.*$/,'');
    }

    toLiteral = function(value, datatype) {
        if (value.resource) {
            if (value.resource.type === 'literal') {
                return value;
            }
            if (value.resource.type === 'uri') {
                return toResource($.rdf.literal( '"' + value + '"', {datatype: datatype} ));
            }
        }
        if (typeof value === 'string') {
            if ( ! datatype) {
                value = '"' + value.toString().replace(/"/g, '\\"') + '"';
            }
            return toResource( $.rdf.literal(value, {datatype: datatype}) );
        }
        throw new Error("cannot create a literal from", value);
    }

    var namespaces = {
        xsd:        "http://www.w3.org/2001/XMLSchema#",
        rdf:        "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
        rdfs:       "http://www.w3.org/2000/01/rdf-schema#",
        owl:        "http://www.w3.org/2002/07/owl#",
        ex:         "http://example.com/#",
        nmo:        "http://www.semanticdesktop.org/ontologies/nmo/#",
        sp:         "http://spinrdf.org/sp#",
        dc:         "http://purl.org/dc/elements/1.1/#",
        sd:         "http://www.w3.org/ns/sparql-service-description#",

        inst:        "http://instruct.vonholzen.org/#",

        notepad:    $.notepad.uri() + '#',  // the notepad resource
        // was notepad:  "http://www.vonholzen.org/instruct/notepad/#",
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

    function scheme(value) {
        return value.substr(0,value.indexOf(':'));
    }
    function knownScheme(value) {
        return ["http", "https", "file", "urn", "mailto", "javascript"].indexOf(value) != -1;
    }
    $.notepad.knownScheme = knownScheme;

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
        if ( value.indexOf(':') == 0) {
            return $.rdf.resource(value, {namespaces: namespaces} );
        }
        if ( value.indexOf(':') > 0) {
            try {
                var urlParts = value.match(/^(\w+):(\S+)/);
                if ( knownScheme(urlParts[1]) ) {
                    return $.rdf.resource('<' + value.toString() + '>', {namespaces: namespaces} );        
                }
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
        throw new Error("unknown type "+binding.type);
    };
    
    Resource = function(value) {
        if (value === undefined) {
            throw new Error("cannot create a resource with an undefined value");
        }
        if ( value instanceof Resource ) {
            this.resource = value.resource;
        } else if ( value instanceof $.rdf.resource || value instanceof $.rdf.literal ) {
            this.resource = value;
        } else if ( value.type && value.value ) {
            this.resource = _fusekiToRdfResource(value);
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
    var memResource = {};
    toResource = function(value) {
        var resource = new Resource(value);
        var key = (resource.resource.datatype || '') + resource.resource.type + resource.toString();
        if (memResource[key]) {
            return memResource[key];
        } else {
            memResource[key] = resource;
            return resource;
        }
    };
    $.notepad.toResource = toResource;

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
                return this.resource.value;     // the string value is maintained in .value
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
        datatype: function() {
            if (!this.isLiteral()) {
                return undefined;
            }
            return this.resource.datatype || undefined;  // Not sure if this default is correct
        }
    };

    $.notepad.newUri = function() {
        return new Resource(":"+guidGenerator());
    };

    $.notepad.toUri= function(value) {
        if (value === undefined) { return undefined; }
        var resource = new Resource(value);
        return resource.toString();
    };

    toTriple = function(tripleOrSubject,predicate,object,operation) {
        if (tripleOrSubject === undefined) {
            return undefined;
        }
        if ( typeof tripleOrSubject === 'string' && !predicate && !object ) {
            tripleOrSubject = $.rdf.triple(tripleOrSubject, {namespaces: namespaces});
        }
        if (tripleOrSubject.subject !== undefined) {
            subject = tripleOrSubject.subject;
            predicate = tripleOrSubject.property || tripleOrSubject.predicate;
            object = tripleOrSubject.object;
        } else {
            subject = tripleOrSubject;
        }

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

        this.subject = toResource(subject);
        this.predicate = toResource(predicate);
        this.object = toResource(object);
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
        pp: function() {
            return this.toPrettyString();
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
                if (value === undefined) { return this; }
                if (value instanceof Array) {
                    $.merge(this, value.filter(function(v) { return (v!==undefined); }));
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
                    this.add(databank);
                } else {
                    this.push(toTriple(value));
                }
                return this;
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
                console.warn("getPredicatesLabelsByLabel on an endpoint of triples not implemented");
                var results = [];
                if (callback) {
                    callback(results);
                }
                return results;
            } },
            execute: { value: function(sparql, callback) {
                return TempFusekiEndpoint(this, function() {
                    this.execute(sparql, callback);
                })
            } },
            subjects: { value: function(predicate, object) {
                return _.keys( this.subjectIndex(predicate, object) );
            } },
            subject: { value: function(predicate, object) {
                var subjects = _.keys( this.subjectIndex(predicate, object) );
                if (subjects.length === 0) {
                    return;
                }
                if (subjects.length === 1) {
                    return subjects[0];
                }
                return subjects;
            } },
            subjectIndex: { value: function(predicate, object) {
                return _.reduce(this.triples(predicate, object), function(memo, triple) { memo[triple.subject] = triple; return memo; }, {});
            } },
            objects: { value: function(subject, predicate) {
                return _.keys( this.objectIndex(subject, predicate) );
            } },
            object: { value: function(subject, predicate) {
                var objects = _.keys( this.objectIndex(subject, predicate) );
                if (objects.length === 0) {
                    return;
                }
                if (objects.length === 1) {
                    return objects[0];
                }
                return objects;
            } },
            objectIndex: { value: function(subject, predicate) {
                return _.reduce(this.triples(subject, predicate), function(memo, triple) { memo[triple.object] = triple; return memo; }, {});
            } },
            toPrettyString: { value: function() {
                return this.join("\n");
            } },
            pp: { value: function() {
                return this.toPrettyString();
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
            dump: { value: function() {
                return this.toDatabank().dump();
            } },
            minus: { value: function(triples) {
                var result = new Triples();
                result.add( this.toDatabank().except(triples.toDatabank()) );
                return result;
            } },
            predicateValues: { value: function(predicate, label) {
                return _.map(this.triples(undefined, predicate, undefined), function(triple) {
                    return {label: triple.object, value: triple.subject};
                });
            } },
            split: { value: function() {
                return _.values(this.toDatabank().subjectIndex);

                this.map(function(triple) {})
            } },
            toString: { value: function() {
                return this.triples(undefined, "rdfs:label").objects().join(",");
            } },
            literals: { value: function(subject, predicate) {
                return this
                    .triples(subject, predicate)
                    .filter(function(triple) { return triple.object.isLiteral(); })
                    .objects();
            } },
            literal: { value: function(subject, predicate) {
                return this.literals(subject, predicate).join();
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

    toTriples = function() {
        var triples = new Triples();
        for(var i = 0; i < arguments.length; i++) {
            triples.add(arguments[i]);
        }
        return triples;
    }
    $.notepad.toTriples = toTriples;

}(jQuery));

// should: be properly exported
function pp(triples) {
    console.log(triples.toPrettyString());
}
function ttl(triples) {
    console.log(triples.toTurtle());
}
