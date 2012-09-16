(function($) {

    var DEFAULT_PREFIXES =
        "PREFIX rdf:  <http://www.w3.org/1999/02/22-rdf-syntax-ns#> \n" +
        "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#> \n" +
        "PREFIX owl:  <http://www.w3.org/2002/07/owl#> \n";


// TODO: move somewhere general (req: figure out JS dependencies)
String.prototype.contains = function(text) {
    return (this.indexOf(text)!=-1);
};

FusekiEndpoint = function(uri) {
    this.uri = uri;
}

FusekiEndpoint.prototype = {
    query: function(command, callback) {
        return $.getJSON(this.uri+'/query', {query: command, output:'json'}, callback);
    },

    update: function(command, callback) {
        return $.post(this.uri+'/update', {update: command}, callback);
    },

    execute: function(command, callback) {
        command = DEFAULT_PREFIXES +
            "PREFIX : <" + $.uri.base() + '#> \n' +
            command;
        if (command.contains('SELECT') || command.contains('CONSTRUCT') || command.contains('DESCRIBE')) {
            return this.query(command, callback);
        } else {
            return this.update(command, callback);
        }
    },

    clear: function(callback) {
        return this.update('DELETE { ?s ?p ?o } WHERE { ?s ?p ?o }',callback);
    },
    post: function(triples, callback) {
        // Not yet implemented
    },
    getSubjectsLabelsByLabel: function(label, callback) {
        var command = 'SELECT ?s ?o WHERE { ?s rdfs:label ?o FILTER regex(?o, "'+label.replace(/"/g, '\\"')+'", "i") }';
        this.execute(command,function(data) { 
            var subjectsLabels = $.map(data.results.bindings, function(element,index) {
                var value = new Resource(element.s.value).toString();
                return { label: element.o.value, value: value };
            });
            callback(subjectsLabels);
        });
    },

    getPredicatesLabelsByLabel: function(label, callback, knownSet) {
        var command = '\
            SELECT DISTINCT ?pred ?label \
            WHERE { \
                ?pred rdfs:label ?label FILTER regex(?label, "'+label+'", "i") \
                { ?s ?pred ?o } UNION { ?pred a rdf:Property } \
            }';
        this.execute(command,function(data) { 
            var results = $.map(data.results.bindings, function(element,index) {
                var uri = new Resource(element.pred.value).toString();
                return { label: element.label.value, value: uri };
            });
            results = _.uniq(results,knownSet);
            callback(results);
        });
    },
  
    getRdf: function(uri, callback) {
        this.describe(uri,callback);
        //this.getRdfBySubjectObject(uri,callback);
    },
    getRdfBySubject: function(subject, callback) {
        var s = new Resource(subject)
        var command = 'SELECT ?s ?p ?o WHERE { '+s.resource.toString() +' ?p ?o }';
        this.execute(command,function(data) { 
            var triples = $.map(data.results.bindings, function(element,index) {
                return new Triple(subject, element.p.value, element.o.value );
            });
            callback(triples);
        });
    },

    getRdfBySubjectObject: function(uri, callback) {
        var r = new Resource(uri)
        var command = 'SELECT ?s ?p ?o WHERE { ' +
                '{ '+r.resource.toString() +' ?p ?o } UNION ' + 
                '{ ?s ?p '+r.resource.toString() +' } ' +
            '}';
        this.execute(command, function(data) { 
            var triples = $.map(data.results.bindings, function(element,index) {
                var subject = element.s || {value: uri};
                var object = element.o || {value: uri};
                return new Triple(subject.value, element.p.value, object.value );
            });
            callback(triples);
        });
    },
    describe: function(uri, callback) {
        var r = new Resource(uri);
        var command = 'DESCRIBE ?s ?p ' +
            'WHERE {' +
                '{ ?s ?p ?o FILTER ( ?s in ( ' + r.toSparqlString() + ') ) } UNION ' +
                '{ ?s ?p ?o FILTER ( ?o in ( ' + r.toSparqlString() + ') ) } ' +
                'OPTIONAL { ?p owl:sameAs ?p2 } ' +
            '}';
        this.execute(command, function(data) {
            console.log(data);
            var triples = new Triples(0);
            for(s in data) {
                for(p in data[s]) {
                    for(i in data[s][p]) {
                        triples.push(new Triple(s,p,data[s][p][i].value));
                    }
                }
            }
            console.log(triples);
            callback(triples);
        });
    },

    getLabels: function(subject, callback, knownLabels) {
        var labels = _.clone(knownLabels);
        var subjectResource = new Resource(subject);
        var command = 'SELECT DISTINCT ?label WHERE { '+ subjectResource.toSparqlString() +' rdfs:label ?label }';
        this.execute(command,function(data) {
            _.each(data.results.bindings, function(binding) {
                labels.push(binding.label.value);
            });
            labels = _.uniq(labels);
            callback(labels);
        });
    },
}

// $.rdf.databank.prototype.sparqlu = function() {
//     var insertData = "";
//     var deleteUris = [];

//     // TODO: should be: insertData = this.triples().join(". \n");
//     var triples = this.triples();  // a jquery object

//     for (var i=0; i<triples.length; i++) {
        
//         if (triples[i].property.toString() == '<http://www.w3.org/2000/01/rdf-schema#label>') {
//             deleteUris.push(triples[i].subject.toString());
//         }
//         insertData += triples[i].toString().replace(/\\/g,'') + ' \n';
//     }

//     return "\
//     DELETE { ?s <http://www.w3.org/2000/01/rdf-schema#label> ?o } WHERE \n\
//     { \n\
//         ?s <http://www.w3.org/2000/01/rdf-schema#label> ?o \n\
//         FILTER (?s in ( " + deleteUris.join(",\n") + ") )   \n\
//     } \n\
//     INSERT DATA \n\
//     { \n\
//         " + insertData + "\n\
//     }";
// };  

})(jQuery);

