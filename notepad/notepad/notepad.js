(function($, undefined) {
	$.widget("mvh.notepad", {

		_predicate_map : {
			'subclass' : 'rdfs:Class',
			'more specifically' : 'rdfs:Class',
			'part' : '-log:implies',
			'requires': '-log:implies',
			'source' : 'rdf:source',
			'synonym' : 'owl:sameAs',
			'i.e.' : 'owl:sameAs',
			'e.g.' : 'owl:sameAs',
			'sequence' : 'rdf:Seq',
			'to' : 'log:implies',
			'more generally' : '-rdfs:Class',
		},

		options : {},

		// Set up the widget
		_create : function() {
			var self = this;

			this.element.addClass("notepad");

			this.element.on("keydown.notepad", function(event) {
			    console.log(event);
				var keyCode = $.ui.keyCode;
				switch (event.keyCode) {
				case keyCode.ENTER:
				case keyCode.NUMPAD_ENTER:
					self._process_enter(event);
					break;
				case keyCode.TAB:
					if (!event.shiftKey) {
						self._indent(event);
					} else {
						self._unindent(event);
					}
					return false;
					break;
				default:
					break;
				}
			});

			this.element.on("click", function(event) {
				if ($(event.target).hasClass('predicate') || $(event.target).hasClass('object')) {
					$(event.target).attr("contenteditable", "true");
				}
			});

			this.element.on("focusout", function(event) {
				if ($(event.target).hasClass('predicate') || $(event.target).hasClass('object')) {
					$(event.target).attr("contenteditable", "false");
				}
			});

			this.list = $("<ul>").addClass("top").attr("default-predicate", "sequence").appendTo(this.element);

			this._appendLi(this.list);

			// Create status element
			this.element.append('<label>Status</label><dl id="status"><dt>Focus</dt><dd id="focus" />'
					+ '<dt>Focus classes</dt><dd id="focus-classes" /><dt>Focus autocomplete disabled</dt>'
					+ '<dd id="focus-autocomplete"/><dt>Labels</dt><dd id="labels" /><dt>RDF</dt><dd id="rdf" /></dl>');

			this.element.on("focusin focus", function(event) {
				var el = $(event.target);
				if (el.hasClass('object')) {
					self._update_object_autocomplete(el.parent('li'));
				}

				$("#focus").text(el.attr('id'));

				$("#focus-classes").text($(event.target).attr("class"));

				if ($(event.target).hasClass("ui-autocomplete-input")) {
					$("#focus-autocomplete").text($(event.target).autocomplete("option", "disabled"));
				}
			});
			
			this.element.on("focusout", function(event) {
				$("#labels").text(self._get_labels());
				$("#rdf").text(self._get_rdf());
			});
			
		},

		_appendLi : function(ul) {
			var self = this;
			var parent_predicate = ul.attr("default-predicate");
			var predicate = $('<span>').addClass('predicate').text(parent_predicate);
			var separator = $('<span>').addClass('separator');
			var object = $('<span>').addClass('object').text('none');

			var li = $('<li>').appendTo(ul);
			li.append(predicate).append(separator).append(object);

			// Must turn on autocomplete *after* the element has
			// been added to the document
			predicate.autocomplete({
				source : Object.keys(this._predicate_map)
			});
			object.autocomplete({
				source : function(term, callback) {
					var labels = self._get_labels();
					var matches = jQuery.grep(labels, function(e) {
						return (e.indexOf(term.term) != -1);
					})
					callback(matches);
				}
			});
		},

		// Use the _setOption method to respond to changes to
		// options
		_setOption : function(key, value) {
			switch (key) {
			case "clear":
				// handle changes to clear option
				break;
			}
		},

		_set_predicate : function(li) {
			var predicate;
			var predicate_label;
			// Top level predicate is 'sequence'
			if (li.parent().parent().hasClass("notepad")) {
				predicate = "rdf:Seq";
				predicate_label = "sequence";
			} else {
				predicate_label = li.children('span.predicate').text();
				predicate = this._predicate_map[predicate_label];
			}

			li.attr("rel", predicate);
			li.children('span.predicate').text(predicate_label);
		},

		_update_object_autocomplete : function(line) {
			var predicate = line.children('span.predicate').text();
			var object = line.children('span.object');
			if (predicate === 'more generally') {
				object.autocomplete('option', 'disabled', false);
			} else {
				object.autocomplete('option', 'disabled', true);
			}
		},

		_process_enter : function(event) {
			el = $(event.target);
			li = el.parent('li');
			ul = li.parent('ul');

			// Process current note
			// set URI
			li.attr("about", this._get_blank_uri());

			// set relationship to parent (set predicate)
			this._set_predicate(li);

			// Focus out
			el.attr("contenteditable", "false");

			// Append new note
			this._appendLi(ul);

			// event.stopImmediatePropagation();
			// return false;
		},

		_indent : function(event) {
			el = $(event.target);
			li = el.parent('li');

			// Prevent moving if the current line has no predecessor
			new_parent = li.prev();
			if (!new_parent.length) {
				return false;
			}

			// Move current line to new_parent
			children = new_parent.children('ul');
			if (!children.length) {
				children = $('<ul>').attr('default-predicate', 'more specifically').appendTo(new_parent);
			}
			children.append(li);

			// set relationship to parent (set predicate)

			// default relationship to a parent is "subclass"
			li.children("span.predicate").text("subclass");

			// event.stopImmediatePropagation();
			// return false;
		},

		_unindent : function(event) {
			el = $(event.target);
			li = el.parent('li');

			// Determine the new location
			new_predecessor = li.parent('ul').parent('li');

			// Prevent moving if we couldn't find the new parent
			if (!new_predecessor.length) {
				return false;
			}

			// Move current line to parent
			li.insertAfter(new_predecessor);
		},

		_get_labels : function() {
			var labels = [];
			this.element.find('span.object').each(function() {
				labels.push($(this).text());
			});
			return labels;
		},
		
		_get_rdf : function() {
			return "RDF";
		},

		_last_uri : 0,

		_get_blank_uri : function() {
			this._last_uri++;
			return ":blank" + this._last_uri;
		},

		_create_note : function(div) {
			div.attr("about", this._get_blank_uri());
			div.attr("property", "rdfs:label");
			return div;
		},

		// Use the destroy method to clean up any modifications your
		// widget
		// has
		// made to the DOM
		destroy : function() {
			this.element.removeClass("notepad");
			this.list.remove();
		}
	});

}(jQuery));