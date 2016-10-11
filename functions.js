function min(dim, data) {
	//Gets the minimum dim from an array of readings (data)
	var vals = data.map( function(obj){return obj[dim]} );
	return Math.min(...vals);
}

function max(dim, data) {
	var vals = data.map( function(obj){return obj[dim]} );
	return Math.max(...vals);
}

function addVideo(src) {
	var video = d3.select(".right").append("video")
		.attr("src", src)
		.attr("width", 600)
		.attr("controls", 1)
		.node();

	//Video timeline goes on this svg
	var	svg = d3.select(".left").append("svg")
		.attr("width", 600)
		.attr("height", 20);

	//Scale for the timeline axis
	var	scale = d3.scaleLinear();
	var	axis = d3.axisBottom();

	video.onloadedmetadata = function() {
		//Draws the timeline axis
		scale = d3.scaleLinear()
			.domain([0, video.duration])
			.range([0, 600]);

		axis = d3.axisBottom(scale).tickFormat( function(d) {
			return d+"s"	
		});
		axis(svg);
	};

	video.ontimeupdate = function() {
		//Updates red line position
		var t = video.currentTime;
		svg.selectAll(".red-line").remove();
	    svg.append("line")
			.attr("class", "red-line")
			.attr("x1", scale(t))
			.attr("y1", 0)
			.attr("x2", scale(t))
			.attr("y2", 20);
		};
}

function addStream(data_obj, dim) {
	/*
	dim = reading value (e.g: "x", "y" or "z") to plot against t
	data_obj = { data:[
		{x:121, y:234, z:787, t:234},
		{x:189, y:834, z:797, t:235}, 
		...
		] }

	*/

	var	data = data_obj.data;

	//Append DOM elements
	var svg_data = d3.select(".left").append("svg")
			.attr("width", 600)
			.attr("height", 250),
	    svg_axis = d3.select(".left").append("svg")
			.attr("width", 600)
			.attr("height", 20),
		svg_nav = d3.select(".right").append("svg")
			.attr("width", 600)
			.attr("height", 120);

	//Scaling functions
	//They map domain to range (data to pixels)
	var tscale = d3.scaleLinear()							
			.domain( [min("t", data), max("t", data)] )				  	
			.range( [0, 600] ),

		dimscale = d3.scaleLinear()							
			.domain( [min(dim, data), max(dim, data)] )				  	
			.range( [30, svg_data.attr("height")-30] ),

		dimscale_nav = d3.scaleLinear()							
			.domain( [min(dim, data), max(dim, data)] )				  	
			.range( [5, svg_nav.attr("height")-5] );

	//Group graph properties 
	var stream = {
		//views
		main: {
			data: data,
			svg: svg_data,
			xscale: tscale,
			yscale: dimscale,
			draw: drawView
		},

		nav: {
			data: data,
			svg: svg_nav,
			xscale: tscale,
			yscale: dimscale_nav,
			draw: drawView
		},
		
		axis: {
			svg: svg_axis,
			xscale: tscale,
			num_ticks: 10,
			draw: drawAxis
		},	

		update: function() {
			this.main.draw(dim);
			this.axis.draw();
		}	
	}

	stream.nav.draw(dim);
	//stream.update();
	stream.main.draw(dim);
	//Define and associate behaviors 
	var zoom;
	var brush;

	brush = d3.brushX()
		.on("brush", function() {
			brushedd(stream, dim, zoom)
		});

	zoom = d3.zoom()
		.on("zoom", function() {
			zoomedd(stream, dim, brush);
		});

	brush(svg_nav);
	zoom(svg_data);
}

function drawView(dim) {
	var	svg = this.svg,
		xscale = this.xscale,
		yscale = this.yscale;

	svg.selectAll("line").remove();
	svg.selectAll("circle").remove();
	svg.selectAll("path").remove();
	
	var line = d3.line()
		.x(function(d){ return xscale(d.t) })
		.y(function(d){ return yscale(d[dim]) });

	svg.append("path")
		.attr("class", dim+"-line")
		.attr("d", line(this.data));

	makeGridd(this, dim);
}


function drawAxis() {
	var ticks = this.ticks,
		svg = this.svg,
		xscale = this.xscale;

	var axis = d3.axisBottom(xscale)
			.ticks(ticks)
			.tickFormat(function (d) {
				var hrs = parseInt(d*(10**-9)/3600),
					mins = parseInt(d*(10**-9)/60) - hrs*60,
					secs = parseInt(d*(10**-9)).toFixed(2) - (mins*60 + hrs*3600)
					msecs = parseInt(d*(10**-6)).toFixed(3) - 1000*(secs + mins*60 + hrs*3600);
			 	return hrs+":"+mins+":"+secs+"."+msecs;
			});
	svg.call(axis);
	//console.log(svg.node());
}

function makeGridd(view, dim) {
	var xscale = view.xscale,
		yscale = view.yscale;

	view.svg.append("line")
	    .attr("x1", xscale(min("t", view.data)))
	    .attr("y1", yscale(0))
	    .attr("x2", xscale(max("t", view.data)))
	    .attr("y2", yscale(0))
	    .attr("class", "grid-line");

	/*view.svg.selectAll("line")
	    .data(view.data)
	  .enter().append("line")
	    .attr("x1", function(d) { return xscale(d.t); })
	    .attr("y1", yscale(0))
	    .attr("x2", function(d) { return xscale(d.t); })
	    .attr("y2", function(d) { return yscale(d[dim]); })
	    .attr("class", "grid-line");*/

	view.svg.selectAll("circle")
	    .data(view.data)
	  .enter().append("circle")
	    .attr("cy", yscale(0))
	    .attr("cx", function(d) { return xscale(d.t); })
	    .attr("r", 1);		
}

function brushedd(stream, dim, zoom) {
	//Change the scale functions
	if (d3.event.sourceEvent && d3.event.sourceEvent.type === "zoom") return;
	var brush_min = d3.event.selection[0],
		brush_max = d3.event.selection[1],
		s = d3.event.selection;

	var scale = d3.scaleLinear()							
	 	.domain([brush_min, brush_max])				  	
	 	.range([0, 600]);

	stream.main.xscale.range([scale(0), scale(600)]);
	stream.axis.xscale.range([scale(0), scale(600)]);
	
	//Update svg's zoom transform to show changes made by brush	
	stream.main.svg.call(zoom.transform, d3.zoomIdentity
								.scale(300/(s[1]-s[0]))
								.translate(600-2*s[0], 0)	
	);

	stream.axis.ticks = (300/(s[1]-s[0]))*10;
	stream.update();
}

function zoomedd(stream, dim, brush) {
	//Change the scale functions
	if (d3.event.sourceEvent && d3.event.sourceEvent.type === "brush") return;
	var pvals = d3.event.transform,
		half_dist = (pvals.k*1200)/2;

	var left = pvals.x-half_dist,
		right = pvals.x+half_dist;

	stream.main.xscale.range([left, right]);
	stream.axis.xscale.range([left, right]);

	var scale = d3.scaleLinear()							
			.domain([pvals.x-half_dist, pvals.x+half_dist])				  	
			.range([0, 600]);

	//TODO: limit how small the brush can be

	brush.move(stream.nav.svg, [scale(0), scale(600)]);	
	stream.axis.ticks = pvals.k*10;
	stream.update();
}

