var w = 1280,
    h = 800,
    node,
    link,
    graph;

var force = d3.layout.force()
    .on("tick", tick)
    .charge(function(d) { return d._children ? -d.size / 100 : -30; })
    .linkDistance(function(d) { return d.target._children ? 80 : 30; })
    .size([w, h - 160]);

var svg = d3.select("body").append("svg:svg")
    .attr("width", w)
    .attr("height", h);

var x = d3.scale.linear()
    .domain([0, w])
    .range([0, w]);

var y = d3.scale.linear()
    .domain([0, h])
    .range([0, h]);

var topG = svg.append("g")
    .call(d3.behavior.zoom().x(x).y(y).scaleExtent([1, 8]).on("zoom", zoom));

topG.append("rect")
    .attr("class", "overlay")
    .attr("width", w)
    .attr("height", h);

var endpoint = $.notepad.getEndpoint();
var dataset = endpoint;
dataset.graph = "http://localhost:3030#instruct-backup";

var query = $.notepad.queries.labeled_graph;
var query = $.notepad.queries.describe;
var uri = "<file://localhost/Users/holzen/git/notepad/notepad/tests/notepad.html#b1f34abe-e9ef-2f8d-1949-f8f018260dd7>";
query.execute(dataset, {about: uri}).done(function(all) {
  graph = all;
  update();
});

function update() {

  var nodesLinks = graph.toNodesLinks();
  var nodes = nodesLinks.nodes,
      links = nodesLinks.links;

  // Restart the force layout.
  force
      .nodes(nodes)
      .links(links)
      .start();

  // Update the links…
  link = topG.selectAll("line.link")
      .data(links, function(d) { return d.target.id; });

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
  node = topG.selectAll("g.node")
      .data(nodes, function(d) { return d.id; })
      .style("fill", color);

  node.transition()
      .attr("r", function(d) { return d.children ? 4.5 : Math.sqrt(d.size) / 10; });

  // Enter any new nodes.
  var g = node.enter().append('g')
      .attr("class", "node")
      .attr("transform", transform);

  g.append("svg:circle")
      .attr("r", function(d) { return d.children ? 4.5 : Math.sqrt(d.size) / 10; })
      .style("fill", color)
      .on("click", click)
      .call(force.drag);

  g.append("text")
      .style("text-anchor", "middle")
      .style("color", "black")
      .text(function(d) { return d.name ? d.name.toString().ellipses(10): ""; });

  // Exit any old nodes.
  node.exit().remove();
}

function tick() {
  link.attr("x1", function(d) { return x(d.source.x); })
      .attr("y1", function(d) { return y(d.source.y); })
      .attr("x2", function(d) { return x(d.target.x); })
      .attr("y2", function(d) { return y(d.target.y); });
      //.attr('transform', transformLink);

  node.attr("transform", transform);
}

// Color leaf nodes orange, and packages white or blue.
function color(d) {
  return d._children ? "#3182bd" : d.children ? "#c6dbef" : "#fd8d3c";
}

// Toggle children on click.
function click(d) {
  if (d.children) {
    d._children = d.children;
    d.children = null;
  } else {
    d.children = d._children;
    d._children = null;
  }
  update();
}

function zoom() {
  node.attr("transform", transform);
  link.attr("x1", function(d) { return x(d.source.x); })
      .attr("y1", function(d) { return y(d.source.y); })
      .attr("x2", function(d) { return x(d.target.x); })
      .attr("y2", function(d) { return y(d.target.y); });

}

function transform(d) {
  return "translate(" + x(d.x) + "," + y(d.y) + ")";
}
function transformLink(d) {
  return "translate("+x(d.source.x)+","+y(d.source.y)+")";
}