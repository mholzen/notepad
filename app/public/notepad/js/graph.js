(function($, undefined) {

    // consider: using the line widget with {objectWidget: readonly-label, predicateWidget: readonly-forward-label}
    $.widget("notepad.graph", {

        options: {
            width: 1280,
            height: 1000,
            data: null,
        },

        _update: function() {

        },
        _create: function() {
        	var w = this.options.width,
        		h = this.options.height;

			this._svg = d3.select(this.element[0]).append("svg:svg")
			    .attr("width", w)
			    .attr("height", h);

		    var x = d3.scale.linear()
			    .domain([0, w])
    			.range([0, w]);

			var y = d3.scale.linear()
			    .domain([0, h])
			    .range([0, h]);

			var nodesLinks = this.options.data.toNodesLinks();
			var nodes = nodesLinks.nodes,
				links = nodesLinks.links;

			var force = d3.layout.force()
			    .on("tick", tick)
			    // .charge(-1000)
			    .charge(function(d) { return d.name ? -1000 : -30; })
			    .linkDistance(100)
			    .size([w, h/2]);

			var topG = this._svg.append("g")
			    .call(d3.behavior.zoom().x(x).y(y).scaleExtent([.1, 8]))
			    .on("zoom", tick);

			topG.append("rect")
			    .attr("class", "overlay")
			    .attr("width", w)
			    .attr("height", h);

			// Restart the force layout.
			force
				.nodes(nodes)
				.links(links)
				.start();

			// Update the links…
			var link = topG.selectAll("line.link")
				// .data(links, function(d) { return d.target.id; });
				.data(links);

			// Enter any new links.
			link.enter().insert("svg:line", ".node")
				.attr("class", "link")
				.attr("x1", function(d) { return x(d.source.x); })
				.attr("y1", function(d) { return y(d.source.y); })
				.attr("x2", function(d) { return x(d.target.x); })
				.attr("y2", function(d) { return y(d.target.y); });
				// .attr('transform', transformLink);

			// Exit any old links.
			link.exit().remove();

			// Update the nodes…
			var node = topG.selectAll("g.node")
				.data(nodes, function(d) { return d.id; })
				.style("fill", "lightblue");

			node.transition()
				.attr("r", function(d) { return d.children ? 4.5 : Math.sqrt(d.size) / 10; });

			// Enter any new nodes.
			var g = node.enter().append('g')
				.attr("class", "node")
				.attr("transform", transform)
				.on('click', function() {
					force.start();
				})
      			.call(force.drag);

			g.append("svg:circle")
				.attr("r", function(d) { return d.children ? 4.5 : Math.sqrt(d.size) / 10; })
				.style("fill", "lightblue")
				.append('svg:title').text(function(d) { return d.name ? d.name.toString() : d.value.toString(); });
;

			g.append("text")
				.style("text-anchor", "middle")
				.style("color", "black")
				.text(function(d) { return d.name ? d.name.toString().ellipses(10): ""; });

			// Exit any old nodes.
			node.exit().remove();

			function transform(d) {
			 	return "translate(" + x(d.x) + "," + y(d.y) + ")";
			}

			function tick() {
				  link.attr("x1", function(d) { return x(d.source.x); })
				      .attr("y1", function(d) { return y(d.source.y); })
				      .attr("x2", function(d) { return x(d.target.x); })
				      .attr("y2", function(d) { return y(d.target.y); });
				  node.attr("transform", transform);
			  // force.start();
			}

        },
        _destroy: function() {
        },
    });

function addGraph(container) {
	var div = $("<div>").appendTo(container.element);
	var graph = div.graph({data: container.triples() });
}
$.notepad.addGraph = addGraph;

}(jQuery));

