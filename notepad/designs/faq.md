FAQ
===

Q - should I search the DOM based on .notepad-* classes or attribute?  How should the various widget interface with each other?

A1 - based on attributes, so that the requirements on other classes is minimal
     => notepad-* helper methods are not available
       => find closest predicate must know about [rel] and [inrel]
       => find closest subject must know about [about]
       	=> which can be expressed on the widget itself.
   	 => a widget

A2 - based on notepad-* classes, so that you can access helper methods immediately



Q - should the API returns widgets or elements?

A1 - API returns a widget
	=> can access elements via this.element
	=> can return collections, by using $().map

A2 - API returns jQuery objects
	=> can access widget via .data()
