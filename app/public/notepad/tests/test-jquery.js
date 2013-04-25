$(document).ready(function() {
      
  $.widget("notepad.aWidget", {

      options: {
        'anOption': 'a default value',
        initCounter: 0,
      },

      _setOption: function(key, value) {
          this._super(key, value);
      },
      _create: function() {
          console.log(this.options.anOption);
          this.options.initCounter ++;
          this.member = 2;
      }
  });
  test("init", function() {
      var element = $('<p>').aWidget().aWidget();
      assertThat(element.data('notepadAWidget').option('initCounter'), 1);
  });

  test("2nd init with options", function() {
      var element = $('<p>').aWidget().aWidget({anOption: '2nd value'});
      assertThat(element.data('notepadAWidget').option('anOption'), '2nd value');
      assertThat(element.data('notepadAWidget').option('initCounter'), 1);
  });

  test("member", function() {
      // I think this is correct
      var element1 = $('<p>').aWidget().data('notepadAWidget');
      var element2 = $('<p>').aWidget().data('notepadAWidget');
      element1.member = 1;
      element2.member = 2;
      assertThat(element1.member, 1);
      assertThat(element2.member, 2);
  });

  test("when I set options", function() {
    var element = $('<p>').aWidget();
    var widget = element.data('notepadAWidget');
    assertThat(widget.options['anOption'], equalTo('a default value'));
    assertThat(widget.option('anOption'), equalTo('a default value'));

    widget.option('anOption', "foo");
    assertThat(widget.options['anOption'], equalTo('foo'));
    assertThat(widget.option('anOption'), equalTo('foo'));
  });

  test("when I create a widget with initial options", function() {
    var element = $('<p>').aWidget({anOption: 'bar'});
    var widget = element.data('notepadAWidget');
    assertThat(widget.options.anOption, equalTo('bar'));
    assertThat(widget.options['anOption'], equalTo('bar'));
    assertThat(widget.option('anOption'), equalTo('bar'));
  });

  test("when I trigger keyboard events on a textarea", function() {
    var element = $('<input id="foo">').appendTo("#qunit-fixture");

    element = $("#foo");
    element.focus();
    element.caretToStart();
    var keyCode = 65;
    element.val('A');
    element.keydown();
    // element.trigger( jQuery.Event('keydown',  {keyCode: keyCode }) );
    // element.trigger( jQuery.Event('keypress', {keyCode: keyCode }) );
    // element.trigger( jQuery.Event('keyup',    {keyCode: keyCode }) );

    assertThat(element.val(), equalTo("A"), "the content should contain the character typed");
  });
  test("events", function() {
    var parent = $("<div>").appendTo("#qunit-fixture");
    var child = $("<div>").appendTo(parent);
    var handler1called = false, handler2called = false;
    parent.on("myEvent", function() { ok(false, "parent should never be called"); });
    child.on("myEvent", function() { handler1called = true; ok(true, "children is called"); });
    child.on("myEvent", function() { handler2called = true; ok(true, "another handler is also called"); return false; });

    child.trigger("myEvent");

    ok(handler1called, "handler1 called");
    ok(handler2called, "handler2 called");
  });
  test("closest, or", function() {
    $("<div id='above' above='a'><div id='below' below='b'><div id='child'>").appendTo("#qunit-fixture");
    assertThat($("#child").closest("[above],[below]").attr('id'), 'below', 'below is found first');
  });

  // Trying to understand Cross Domain Security
  skippedTest("cross domain", function() {
    var url = 'http://instruct.vonholzen.org:3030/dev';
    url = 'http://www.nytimes.com';
    url = 'http://i1.nyt.com/images/2013/01/03/fashion/03MOTH-MADUKA/03MOTH-MADUKA-moth.jpg';

    $.ajax({url: url}).success(function() {
        assertThat(true);
        start();
    });

  });

  asyncTest("deferred", function() {
    var url = 'http://localhost:11111/dev';
    var response = $.getJSON(url);
    response.complete();
    response.error(function() {
        assertThat(true);
        start();
    });
  });

});
