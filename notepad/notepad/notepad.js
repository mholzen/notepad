(function($, undefined) {
	var CONTAINER_DEFAULT_PREDICATE_ATTR = 'container-default-predicate';
	
	$.widget("mvh.line", {

		// A line is a widget representing 
		//	1 - a URI and its representation as text
		//	2 - its relationship to a container
		//	3 - a collection of other lines for which it is the container
				
		// From 1, a line has a URI	 (getUri/setURI)
		// A line also has an optional representation triple (uri, rdfs:label, "label")
		// A new line should have a URI but no representation.
		
		// From 2, a line has a container (getContainer)
		// The container defines
		//	  - a container URI
		//	  - a container default predicate

		// From 3, a line has a collection of 'children' lines getLines()
		
		options : {},

		notepad : undefined,

		_getUri: function() {
			return this.element.attr("about");
		},
		_setUri: function(uri) {
			this.element.attr('about',uri);
			// Setting the URI should update the representation
			// TODO: search the RDF for URI, "rdfs:label"
		},

		_getContainer: function() {
			var container = this.element.parents('[about]');
			if (!container.length) {
				throw "cannot find a container with a URI";
			}			 
			return container;
		},
		_getContainerUri: function() {
			return this._getContainer().attr('about');
		},
		_getContainerDefaultPredicate: function() {
			var predicate = this._getContainer().attr(CONTAINER_DEFAULT_PREDICATE_ATTR);
			if (predicate===undefined) {
				predicate = "rdf:Seq";
			}
			return predicate;
		},

		setContainerPredicateUri: function(uri) {
			this._setContainerPredicateUri(uri);
			var label = this._getContainerPredicateLabelByUri(uri);
			this._setContainerPredicateLabel(label);				
		},
		_setContainerPredicateUri: function(uri) {
			this.predicate.attr('rel',uri);			   
		},
		setContainerPredicateLabel: function(label) {
			this._setContainerPredicateLabel(label);
			var uri = this._getContainerPredicateUriByLabel(label);
			this._setContainerPredicateUri(uri);
		},
		_setContainerPredicateLabel: function(label) {
			this.predicate.text(label); // Does this trigger a change event?
		},

		_getContainerPredicateUri: function() {
			return this.predicate.attr('rel');
		},

		_getContainerPredicateUriByLabel: function(label) {
			var uri = this.notepad._predicateMap[label];
			if ( uri === undefined ) {
				throw "cannot find a uri matching the label " + label;
			}

			return uri;
		},
		_getContainerPredicateLabelByUri: function(uri) {
			var map =  this.notepad._predicateMap;
			for (var label in map) {
				if (uri === map[label]) {
					return label;
				}
			}
			return "";
		},

		_getLinePredicateUri: function() {
			return "rdfs:label";
		},
		_setLinePredicateUri: function() {
			throw "not yet implemented";
		},
		
		_getLineLiteral: function() {
			return this.object.text();
		},
		setLineLiteral: function(text) {
			this.object.text(text);
		},

		getList: function() {
			return this.element.children('ul');
		},

		// Set up the widget
		_create : function() {
			var self = this;
			
			// Find parent notepad for use by getPredicateBy _predicateMap
			this.notepad = this.element.parents('.notepad').data("notepad");
			if (!this.notepad) {
				throw "Cannot find notepad element in parent of current new line";
			}

			// Find the container
			this.container = this.element.parents('.line').data("line");
			if(!this.container) {
				// We have a notepad but not a container, so this is a top level line
				this.container = this.notepad;
			}
			
			this.element.addClass("line");
			this._setUri(this.notepad._getBlankUri());
			
			this.predicate = $('<textarea rows="1">').addClass('predicate');
			this.setContainerPredicateUri(this._getContainerDefaultPredicate());
			//this.predicate.change(function(event) { self._setContainerPredicateUri(this._getContainerPredicateUriByLabel($(event.target).text()));});
			this.element.append(this.predicate);

			// Must turn on autocomplete *after* the element has
			// been added to the document
			this.predicate.autocomplete({
				source : Object.keys(this.notepad._predicateMap)
			});
			
			// Separator
			var separator = $('<span>').addClass('separator');
			this.element.append(separator);
			
			// Object
			this.object = $('<textarea rows="1" cols="40">').addClass('object');
			this.element.append(this.object);
			this.object.autocomplete({
				source : function(term, callback) {
					var labels = self.notepad._getLabels();
					var matches = jQuery.grep(labels, function(e) {
						return (e.indexOf(term.term) != -1);
					})
					callback(matches);
				}
			});

			// Necessary?
			//this.container.append(this.element);			
		},
		
		focus: function() {
			return this.element.find(".object").focus();
		},
		
		containerTriple: function() {
			return [
				this._getUri(),
				this._getContainerPredicateUri(),
				this._getContainerUri()
			];
		},
		lineTriple: function() {
			return [
				this._getUri(),
				this._getLinePredicateUri(),
				this._getLineLiteral()
			];
		},

		setLineTriple: function(triple) {
			this._setUri(triple[0]);
			if (triple[1] !== 'rdfs:label') {
				throw "line triple predicate is not rdfs:label";
			}
			//this._setObjectPredicate('');	 // rdfs:label			  
			this._setLiteral(triple[2]);
		},
		
		childTriples: function() {
			return [];
		},
		triples: function() {
			var triples = [this.containerTriple(), this.lineTriple()];
			var childTriples = this.childTriples();			   
			if (childTriples.length) {
				triples.concat(childTriples);
			}
			return triples;
		},

		destroy : function() {
			this.element.removeClass("notepad");
			this.list.remove();
		}
	});
	
	$.widget("mvh.notepad", {
		// A notepad defines
		//	- a toplevel URI
		//	- a list of lines

		// TODO: this should instead be expressed in RDF as a collection of 'predicate-uri', 'rdfs:label', '<label>'
		_predicateMap : {
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
		rdf : [],

		getUri: function() {
			return this.element.attr('about');
		},
		_setUri: function(uri) {
			if (this.element.attr('about')!==undefined && this.list) {
				// changing the top-level URI clears the list
				this.list.remove();
			}
			this.element.attr('about',uri);
		},
		
		getList: function() {
			return this.element.children('ul');
		},
		
		// Set up the widget
		_create : function() {
			var self = this;

			this.element.addClass("notepad");
			
			this._setUri(this._getBlankUri());
			
			this.element.on("keydown.notepad", function(event) {
				var keyCode = $.ui.keyCode;
				switch (event.keyCode) {
				case keyCode.ENTER:
				case keyCode.NUMPAD_ENTER:
					return self._process_enter(event);
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

			this.list = $('<ul>')
				.addClass("top")
				.attr(CONTAINER_DEFAULT_PREDICATE_ATTR, "rdf:Seq")
				.appendTo(this.element);
			this._appendLine(this.list);

			// DEBUG
			// Create status element
			this.element.append('<label>Status</label><dl id="status"><dt>Focus</dt><dd id="focus" />'
					+ '<dt>Focus classes</dt><dd id="focus-classes" /><dt>Focus autocomplete disabled</dt>'
					+ '<dd id="focus-autocomplete"/><dt>Labels</dt><dd id="labels" /><dt>RDF</dt><dd id="rdf" /></dl>');

			this.element.on("focusin focus", function(event) {
				var el = $(event.target);
				if (el.hasClass('object')) {
					self._update_object_autocomplete(el.parent('li'));
				}

				// DEBUG
				$("#focus").text(el.attr('id'));

				// DEBUG
				$("#focus-classes").text($(event.target).attr("class"));

				if ($(event.target).hasClass("ui-autocomplete-input")) {
					$("#focus-autocomplete").text($(event.target).autocomplete("option", "disabled"));
				}
			});
			
			// DEBUG
			// this.element.on("focusout", function(event) {
			//	$("#labels").text(self._getLabels());
			//	$("#rdf").text(self._getRdf());
			// });
			
		},
		
		_appendLine: function(ul) {
			return $('<li>').appendTo(ul).line();
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
				predicate_label = li.children('.predicate').val();
				predicate = this._predicateMap[predicate_label];
			}

			li.attr("rel", predicate);
			li.children('.predicate').text(predicate_label);
		},

		_update_object_autocomplete : function(line) {
			var predicate = line.children('.predicate').val();
			var object = line.children('.object');
			if (predicate === 'more generally') {
				object.autocomplete('option', 'disabled', false);
			} else {
				object.autocomplete('option', 'disabled', true);
			}
		},

		_process_enter : function(event) {
			var el = $(event.target);
			var li = el.parent('li');
			var ul = li.parent('ul');
			
			// find or create the next line
			var next = li.next();
			if (!next.length) {
				next = this._appendLine(ul);
			}
			// move focus to new line
			next.line("focus");
			
			return false;
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
			li.children(".predicate").text("subclass");

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

		_getLabels : function() {
			var labels = [];
			this.element.find('.object').each(function() {
				labels.push($(this).val());
			});
			return labels;
		},
		
		_getRdf : function() {
			return this.rdf;
		},
		setRdf: function(triples) {
			this.rdf = triples;
			var notepad = this;
			jQuery.each(triples, function(index,triple){
				var subject = triple[0];
				var predicate = triple[1];
				var object = triple[2];
				if(subject !== notepad.getUri()) {
					if (predicate = 'rdfs:Label') {
						// Find a line with the subject as URI
						var li = notepad.getList().find('li[about="'+subject+'"]');
						if (li.length) {
							li.data('line').setLineLiteral(object);
						}
					}
				}

				// Find or create the line for that triple based on the predicate and line URI
				// TODO: should handle multiple triples with different predicates to the same URI?
				var lines = notepad.getList().children('li .predicate[rel="'+predicate+'"]');	  // TODO: depends on mvh.line structure
				
				// If there are multiple lines, we need additional triples to identify the lines to find or create
				if (lines.length>1) {
					throw "multiple lines of identical RDF: requires more triples to identify them";
				}

				var line;
				if (lines.length==1) {
					line = lines[0];
				} else if (lines.length==0) {
					line = notepad._appendLine(notepad.getList());	// TODO: 'this' is the triple.	should be the notepad
				}
				line = line.data('line');
				line._setContainerPredicateUri(predicate);
			});
			
			
		},

		_last_uri : 0,

		_getBlankUri : function() {
			this._last_uri++;
			return ":blank" + this._last_uri;
		},

		triples: function(){
			var triples = [];
			this.list.find('li').each(function() { triples = triples.concat($(this).line("triples")); } );
			return triples;
		},

		displayChildren: function(triples, uri, container) {

			jQuery.each(triples, function(index,triple){
				var subject = triple[0];
				var predicate = triple[1];
				var object = triple[2];
				if(subject !== uri) {	   // TODO: should be value.subject
					return;
				}
				// We have a triple whose subject match

				// Find or create the lines
				var lines = container.children('li .predicate[rel='+predicate+']');		// TODO: depends on mvh.line structure
				
				// If there are multiple lines, we need additional triples to identify the lines to find or create
				if (lines.length>1) {
					throw "multiple lines of identical RDF: requires more triples to identify them";
				}

				// var line;
				// if (lines.length==1) {
				//	   line = lines[0];
				// } else if (lines.length==0) {
				//	   line = this._appendLine(container);	// TODO: 'this' is the triple.	should be the notepad
				// }
				// line = line.data('widget');
				// 
				// line._set_predicate(predicate);		 // TODO: should be pre
				// line._set_predicate_label("predicate_label");
				
			})
			
		},
		
		destroy : function() {
			this.element.removeClass("notepad");
			this.list.remove();
		}
	});

}(jQuery));