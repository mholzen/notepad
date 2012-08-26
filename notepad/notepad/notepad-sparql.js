(function($) {

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
        command =
            "PREFIX rdf:  <http://www.w3.org/1999/02/22-rdf-syntax-ns#> \n" +
            "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#> \n" +
            "PREFIX : <" + $.uri.base() + '#> \n' +
            command;
        if (command.contains('SELECT') || command.contains('CONSTRUCT')) {
            return this.query(command, callback);
        } else {
            return this.update(command, callback);
        }
    },

    clear: function(callback) {
        return this.update('DELETE { ?s ?p ?o } WHERE { ?s ?p ?o }',callback);
    },

    getSubjectsLabelsByLabel: function(label, callback) {
        var command = 'SELECT ?s ?o WHERE { ?s rdfs:label ?o FILTER regex(?o, "'+label+'", "i") }';
        this.execute(command,function(data) { 
            var subjectsLabels = $.map(data.results.bindings, function(element,index) {
                var value = new Resource(element.s.value).toString();
                return { label: element.o.value, value: value };
            });
            callback(subjectsLabels);
        });
    },

    getPredicatesLabelsByLabel: function(label, callback) {
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
            callback(results);
        });
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

    getLabelsBySubject: function(subject, callback, knownLabels) {
        var s = new Resource(subject);
        var command = 'SELECT DISTINCT ?label WHERE { '+s.resource.toString() +' rdfs:label ?label }';
        this.execute(command,function(data) { 
            var labels = $.map(data.results.bindings, function(element,index) {
                return element.label.value;
            });
            _.uniq(labels,knownLabels);
            callback(labels);
        });
    },    
}

$.rdf.databank.prototype.sparqlu = function() {
    var insertData = "";
    var deleteUris = [];

    // TODO: should be: insertData = this.triples().join(". \n");
    var triples = this.triples();  // a jquery object

    for (var i=0; i<triples.length; i++) {
        
        if (triples[i].property.toString() == '<http://www.w3.org/2000/01/rdf-schema#label>') {
            deleteUris.push(triples[i].subject.toString());
        }
        insertData += triples[i].toString().replace(/\\/g,'') + ' \n';
    }

    return "\
    DELETE { ?s <http://www.w3.org/2000/01/rdf-schema#label> ?o } WHERE \n\
    { \n\
        ?s <http://www.w3.org/2000/01/rdf-schema#label> ?o \n\
        FILTER (?s in ( " + deleteUris.join(",\n") + ") )   \n\
    } \n\
    INSERT DATA \n\
    { \n\
        " + insertData + "\n\
    }";
};  

})(jQuery);

