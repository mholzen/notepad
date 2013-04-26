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

function hashToResource(hash) {
    var fragment = hash.substring(1);
    var resource = new Resource(fragment);
    if (resource.isLiteral()) {
        resource = new Resource(":" + fragment);
    }
    return resource;
}

$(function() {

    var hash = window.location.hash;
    if (hash) {
        $("#notepad").attr('about', hashToResource(hash));
    }

    var defaultEndpoints = [
            'http://' + $.uri.base().authority.replace(/:(.*)$/, '') + ':3030/dev',
            'http://instruct.vonholzen.org:3030/dev'
        ];

    var endpoint = $.notepad.getParameterByName('endpoint') || defaultEndpoints;
    var dataset = $.notepad.getParameterByName('dataset');

    notepad = $("#notepad").notepad({endpoint: endpoint, dataset: dataset}).data('notepadNotepad');

    $("#notepad").on('keydown', '[contenteditable="true"]', function(event) {
        if (event.keyCode === 32 && event.ctrlKey) {
            var line = $(event.target).closest(":notepad-line").data('notepadLine');
            line.option('describeDepth', 1);
            line.childrenToggle();
            // Must prevent autocomplete from triggering
        }

        if (event.keyCode === 83 && event.metaKey) { // Alt/Cmd - S
            event.preventDefault();     // prevents save dialog
            notepad.save();
        }

    });
    
    $("#notepad").on('keyup', '.notepad-object3 [contenteditable="true"]', function(event) {
        var target = $(event.target);
        if (event.keyCode != 186 /* colon */ ) {
            return;
        }
        var line = target.closest(":notepad-line");
        if (!line) {
            log.error("cannot find a line widget");
            return;
        }
        line = line.data('notepadLine');
        if (line.isPredicateVisible()) {
            log.info("predicate is already shown.  Ignoring ':'");
            return;
        }
        line.discoverPredicate(event);
    });

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
        var targetSelector = $(event.target).data('toggle');
        $(targetSelector).toggle();
    });
    $('#notepad').on("focus", '[contenteditable="true"]', function(event) {
        container = $(event.target).closest(":notepad-container").data('notepadContainer');

        line = $(event.target).closest(":notepad-line").data('notepadLine');
        predicate = line ? line.getPredicate() : undefined;
        predicateLabel = predicate ? predicate.getLabel() : undefined;

        object = line ? line.getObject() : undefined;
        uri = object.isUri() ? object.uri().getUri() : undefined;

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

    $(".toggle .toggle-button").click(function(event) {
        $(event.target).closest('.toggle').find('.toggle-target').toggle();      // should: not depend on having to call parent() twice
        $(event.target).toggleClass('ui-icon-plus').toggleClass('ui-icon-minus');
    });

    $(".reload").click(function(event) {
        notepad.reset();
    });

    setTimeout(function() {
        notepad.focus();
    }, 500);

});
