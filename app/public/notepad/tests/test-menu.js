test("create", function() {
	var menu2 = $('<ul><li class="template"><a>').menu2().appendTo("#fixture").data('notepadMenu2');
	assertThat(menu2.element.html(), not(""));
});

test("menu call", function() {
	var urilabel = $('<div>http://ex.com</div>').urilabel();

	var menu2 = $('<ul><li class="template"><a>').menu2({source: urilabel}).appendTo("#fixture").data('notepadMenu2');

	assertThat(menu2.element.text(), containsString("Fetch URL"));
});