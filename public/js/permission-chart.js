function PermissionGraph(path){
  this.path = path;
}

PermissionGraph.prototype.load = function(){
  var outerRadius = 580 / 2,
      innerRadius = outerRadius - 130;

  var fill = d3.scale.category20c();
  var chord = d3.layout.chord()
      .padding(0.04)
      .sortSubgroups(d3.descending)
      .sortChords(d3.descending);

  var arc = d3.svg.arc()
      .innerRadius(innerRadius)
      .outerRadius(innerRadius + 20);

  var arcUp = d3.svg.arc()
      .innerRadius(innerRadius + 100)
      .outerRadius(innerRadius + 140);

  var pie = d3.layout.pie()
      .sort(null)
      .value(function(d) { return d; });

  this.svg = d3.select(".permissions").append("svg")
      .attr("width", outerRadius * 2)
      .attr("height", outerRadius * 2)
      .append("g")
      .attr("transform", "translate(" + outerRadius + "," + outerRadius + ")");
  var indexByName;
  var that = this;
  d3.json(this.path, function(error, imports) {
    indexByName = d3.map();
    var nameByIndex = d3.map(),
        colorByIndex = d3.map(),
        matrix = [],
        n = 0;
    var serverCount = 0;
    var userCount = 0;

    // Compute a unique index for each package name.
    imports.forEach(function(d) {
      if (!indexByName.has(d = d.name)) {
        if (d.lastIndexOf("server.")!==-1) {
          serverCount += 1;
          name = d.substring("server.".length,d.length); 
        }else if (d.lastIndexOf("target.")!==-1){
          userCount += 1;
          name = d.substring("target.".length,d.length);
        }else{
          name = d;
        }
        nameByIndex.set(n, name);
        indexByName.set(d, n++);
      }
    });

    // Construct a square matrix counting package imports.
    imports.forEach(function(d) {
      var source = indexByName.get(d.name),
          row = matrix[source];
      colorByIndex.set(source, d.color);
      if (!row) {
        row = matrix[source] = [];
        for (var i = -1; ++i < n;){
          row[i] = 0;
        }
      }
      d.imports.forEach(function(d) { row[indexByName.get(d)]++; });
    });

    chord.matrix(matrix);

    var color = d3.scale.category20();
    var upg = that.svg.selectAll(".upgroup")
      .data(pie([userCount + 1.5,serverCount]))
        .enter().append("g")
        .attr("class", "upgroup");

    var g = that.svg.selectAll(".group")
        .data(chord.groups)
        .enter().append("g")
        .attr("class", "group")
        .on("mouseover", that.fade(false))
        .on("mouseout", that.fade(true));

    g.append("path")
      .attr("class", "group")
      .style("fill", function(d) { return colorByIndex.get(d.index); })
      .style("stroke", function(d) { return d3.rgb(colorByIndex.get(d.index)).darker(); })
      .transition().delay(function(d, i) { return i * 100; }).duration(100)
      .attrTween('d', function(d) {
           var i = d3.interpolate(d.startAngle+0.1, d.endAngle);
           return function(t) {
               d.endAngle = i(t);
             return arc(d);
           };
      });
      //.attr("d", arc);


    upg.append("path")
      .attr("class", "group")
      .style("fill", function(d, i) { return color(i); })
      .style("stroke", "#FFFFFF")
      .style("stroke-width", "2px" )
      .transition().delay(function(d, i) { return i * 500; }).duration(500)
      .attrTween('d', function(d) {
           var i = d3.interpolate(d.startAngle+0.1, d.endAngle);
           return function(t) {
               d.endAngle = i(t);
             return arcUp(d);
           };
      });

    g.append("text")
        .each(function(d) { d.angle = (d.startAngle + d.endAngle) / 2; })
        .attr("dy", ".35em")
        .attr("class", "text")
        .attr("transform", function(d) {
          return "rotate(" + (d.angle * 180 / Math.PI - 90) + ")" + "translate(" + (innerRadius + 26) + ")" + (d.angle > Math.PI ? "rotate(180)" : "");
        })
        .style("text-anchor", function(d) { return d.angle > Math.PI ? "end" : null; })
        .text(function(d) { return nameByIndex.get(d.index); });


    that.svg.selectAll(".chord")
        .data(chord.chords)
        .enter().append("path")
        .attr("class", "chord")
        .style("stroke", function(d) { return d3.rgb(colorByIndex.get(d.target.index)).darker(); })
        .style("fill", function(d) { return colorByIndex.get(d.target.index); })
        .transition().delay(function(d, i) { return i * 100; }).duration(100)
        .attr("d", d3.svg.chord().radius(innerRadius));
  });

  d3.select(self.frameElement).style("height", outerRadius * 2 + "px");
};


/** Returns an event handler for fading a given chord group. */
PermissionGraph.prototype.fade = function(show) {
  var that = this;
  return function(g, i) {
    var opacity = show ? 1 : 0.1;
    that.svg.selectAll(".chord")
        .filter(function(d) {
          return d.source.index != i && d.target.index != i;
        })
      .transition()
        .style("opacity", opacity);
  };
};

PermissionGraph.prototype.highlight = function(node){
    this.svg.selectAll(".chord")
        .filter(function(d) {
          return d.source.index == indexByName.get(node) && d.target.index == indexByName.get(node);
        })
      .style("fill",  function(d) { return d3.rgb("#F00").darker(); });
};
