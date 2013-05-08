module("controller", {
	setup: function() {
		this.element = $('<div>').appendTo("#qunit-fixture").notepad();
		this.notepad = this.element.data('notepadNotepad');
	}
});

test('controller', function() {
	assertThat(this.controller.identity());
});