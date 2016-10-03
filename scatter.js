function updateAxis() {
	var axis = d3.axisBottom(xscale)
			.ticks(d3.timeMinute.every(1));
	svg_axis.call(axis);
}

function draw(svg, yscale) {
	updateAxis();
	svg.selectAll("*").remove();
	var line = d3.line()
		.x(function(d){ return xscale(d.t) })
		.y(function(d){ return yscale(d.x) });

	svg.append("path")
		.attr("class", "data-line")
		.attr("d", line(data));

	makeGrid(svg, line, yscale);		
}

function makeGrid(svg, line, yscale) {
	svg.append("path")
		.attr("class", "grid-line")
		.attr("d", line([ {t:tmin, x:0},{t:tmax, x:0}  ]));

	svg.selectAll("line")
	    .data(data)
	  .enter().append("line")
	    .attr("x1", function(d) { return xscale(d.t); })
	    .attr("y1", yscale(0))
	    .attr("x2", function(d) { return xscale(d.t); })
	    .attr("y2", function(d) { return yscale(d.x); })
	    .attr("class", "grid-line");

	svg.selectAll("circle")
	    .data(data)
	  .enter().append("circle")
	    .attr("cy", yscale(0))
	    .attr("cx", function(d) { return xscale(d.t); })
	    .attr("r", 1);		
}

function zoomed() {
	if (d3.event.sourceEvent && d3.event.sourceEvent.type === "brush") return;
	var pvals = d3.event.transform,
		half_dist = (pvals.k*1200)/2;
	xscale.range([pvals.x-half_dist, pvals.x+half_dist]);

	var scale = d3.scaleLinear()							
			.domain([pvals.x-half_dist, pvals.x+half_dist])				  	
			.range([0, 600]);

	//TODO: limit how small the brush can be
	brush.move(svg_overview, [scale(0), scale(600)]);	
	
	draw(svg, yscale);
}


function brushed() {
	if (d3.event.sourceEvent && d3.event.sourceEvent.type === "zoom") return;
	var brush_min = d3.event.selection[0],
		brush_max = d3.event.selection[1],
		s = d3.event.selection;

	var scale = d3.scaleLinear()							
	 	.domain([brush_min, brush_max])				  	
	 	.range([0, 600]);

	xscale.range([scale(0), scale(600)]);
	
	//Update svg's zoom transform to show changes made by brush	
	svg.call(zoom.transform, d3.zoomIdentity
								.scale(300/(s[1]-s[0]))
								.translate(600-2*s[0], 0)	
	);

	draw(svg, yscale);
}


//Initialisation
//--DOM element variables
var svg = d3.select(".zoomed"),
	svg_overview = d3.select(".overview"),
    svg_axis = d3.select("body").append("svg")
    	.attr("class", "axis")
    	.attr("width", 600)
    	.attr("height", 20);

//--Data variables
var some_data = data_obj.data.slice(0, 100),
	some_tvals = some_data.map( function(obj){return obj.t} ),

	data = data_obj.data.slice(0, 1000),

	tvals = data.map( function(obj){return obj.t} ),
	tmin = Math.min(...tvals),
	tmax = Math.max(...tvals),

	xvals = data.map( function(obj){return obj.x} ),
	xmin = Math.min(...xvals),
	xmax = Math.max(...xvals);

//--Scaling functions
var xscale = d3.scaleLinear()							
		.domain([tmin, tmax])				  	
		.range([0, 600]),

	yscale = d3.scaleLinear()							
		.domain([xmin, xmax])				  	
		.range([20, svg.attr("height")-20]),

	yscale_overview = d3.scaleLinear()							
		.domain([xmin, xmax])				  	
		.range([5, svg_overview.attr("height")-5]);

//--Behaviours
var zoom = d3.zoom()
		.on("zoom", zoomed);

	brush = d3.brushX()
		.on("brush", brushed);

//Draw
draw(svg, yscale);
draw(svg_overview, yscale_overview);

//Associate behaviours
zoom(svg);
brush(svg_overview);

