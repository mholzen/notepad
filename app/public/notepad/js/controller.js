var endpoint;
var notepad;
var container;
var line;
var childContainer;
var childLines;
var object;
var uri;
var literal;
var urilabel;
var predicate;
var predicateLabel;
var toUri = $.notepad.toUri;

var dev = $.notepad.dev;
var test = $.notepad.test;

var log = console;

$(function() {

    function getEndpoint() {
        var endpoint = new FusekiEndpoint ( $.notepad.getParameterByName('endpoint') || $.notepad.defaultEndpoint.url );
        
        // Set the meaning of the empty prefix ':' to the value of the endpoint,
        // so that the application (in the page URL) does not interfere with the data URI
        $.notepad.namespaces[''] = endpoint.url + '#';

        return endpoint;
    }

    function user() {
        var cookie = $.cookie('user');
        if (! cookie) {
            return;
        }
        return toResource(cookie);
    }

    if (! user() ) {
        window.location = "/";
        return;
    }

    function hashToResource(hash) {
        var fragment = hash.substring(1);
        var resource = toResource(fragment);
        if (resource.isLiteral()) {
            resource = toResource(":" + fragment);
        }
        return resource;
    }

    var hash = window.location.hash;
    if (hash) {
        $("#notepad").attr('about', hashToResource(hash));
    }

    setupNotepad (
        $.notepad.getParameterByName('dataset'),
        user()
    );

    function createNotepadWithEndpoint(endpoint, workspace, user) {
        endpoint.graph = workspace;
        notepad = $("#notepad").notepad({endpoint: endpoint, identity: user}).data('notepadNotepad');
        endpoint = notepad.element.data('notepadEndpoint');

        setTimeout(function() {
            notepad.focus();
        }, 500);
    }

    function setupNotepad(datasetParam, user) {
        var endpoint = getEndpoint();
        var datasetParam = $.notepad.getParameterByName('dataset');

        if ( datasetParam ) {
            return createNotepadWithEndpoint ( endpoint, datasetParam, user );
        } else {
            endpoint.selectWorkspace( user, function (workspace) {
                createNotepadWithEndpoint ( endpoint, workspace, user );
            });
        }
    }


    $(".triples").click(function() {
        $(this).siblings(".turtle").text(notepad.triples().toTurtle());
    });

    $(".preview").click(function() {
        var removed = notepad.removed().toTurtle();
        $(this).siblings(".delete").text(removed);

        var added = notepad.added().toTurtle();
        $(this).siblings(".update").text(added);
    });
    $(".save").click(function() {
        notepad.save();
    });
    
    $('.toggle').on('click', function(event) {
        var classes = $(event.currentTarget).data('toggle-class');
        var target = $(event.currentTarget).data('toggle-on') || $(event.currentTarget);
        if (classes) {
            $(target).toggleClass(classes);
        } else {
            $(target).toggle();
        }
    });

    $('#notepad').on("focus", '[contenteditable="true"]', function(event) {
        container = $(event.target).closest(":notepad-container").data('notepadContainer');

        line = $(event.target).closest(":notepad-line").data('notepadLine');
        predicate = line ? line.getPredicate() : undefined;
        predicateLabel = predicate ? predicate.getLabel() : undefined;

        object = line ? line.getObject() : undefined;
        uri = (object && object.isUri()) ? object.uri().getUri() : undefined;

        childContainer = line ? line.getChildContainer() : undefined;
        childLines = childContainer ? childContainer.getLines() : undefined;

        urilabel = $(event.target).closest(":notepad-urilabel").data('notepadUrilabel');

        literal = $(event.target).closest(":notepad-literal").data('notepadLiteral');
    });

        // This should also update the menu with available contextual functions
        // Menu entries should also be derived from the rdfs:class of the selected URI (e.g. email a person)


    $("#status").hide();
    $(document).ajaxStart(function(){
        var status = $("#status");
        if (status.text() == "") {
            status.text("Loading...");
            console.time("[controller] load");
        }
        status.show();
    });
    $(document).ajaxStop(function(){
        var status = $("#status");
        setTimeout(function() {
            status.fadeOut(200);
            setTimeout(function() {
                status.text("");
                console.timeEnd("[controller] load");
            }, 200);
        }, 200);
    });
    $(document).ajaxError(function(){
        $("#status").text("Error! (check the console)");
        console.timeEnd("load");
    });

    $(".reload").click(function(event) {
        notepad.reset();
    });

});
