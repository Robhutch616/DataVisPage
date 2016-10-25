function min(dim, data) {
	//Gets the minimum dim from an array of readings (data)
	var vals = data.map( function(obj){return obj[dim]} );
	return Math.min(...vals);
}

function max(dim, data) {
	var vals = data.map( function(obj){return obj[dim]} );
	return Math.max(...vals);
}

function makeSvg(width, height, div_class, svg_class) {
	return svg_axis = d3.select("."+div_class).append("svg")
				.attr("width", width)
				.attr("height", height)
				.attr("class", svg_class);
}

function makeVerticalScale(data, svg, margin) {
	var very_min = Math.min(min("x", data), min("y", data), min("z", data));
		very_max = Math.max(max("x", data), max("y", data), max("z", data)),
		h = svg;

	if (typeof(svg) === "object") {h = svg.attr("height")};
	var scale = d3.scaleLinear()							
				.domain( [very_min, very_max] )				  	
				.range( [margin, h-margin] );
	return scale;
}

function addVideo(src, stream) {
	var video = d3.select(".right").insert("video", ":first-child")
		.attr("src", src)
		.attr("width", 600)
		.attr("controls", 1)
		.node();

	video.onloadedmetadata = function() {
		stream.video_start = 100;
		stream.video_end = video.duration;
	};

	video.ontimeupdate = function() {
		stream.video_current = video.currentTime;
		stream.update();
	};
}

function drawDim(stream, dim, offset=0, rm=true) {
	var	svg = stream.svg,
	xscale = stream.xscale,
	yscale = stream.yscale;

	if (rm) {
		svg.selectAll("line").remove();
		svg.selectAll("circle").remove();
		svg.selectAll("path").remove();		
	}
	
	var line = d3.line()
		.x(function(d){ return stream.hscale(d.t) })
		.y(function(d){ return stream.vscale(d[dim])+offset });

	svg.append("path")
		.attr("class", dim+"-line")
		.attr("d", line(stream.data));
}

function drawAxis(stream) {
	var ticks = stream.axis.num_ticks,
		svg = stream.axis.svg,
		xscale = stream.hscale;

	var axis = d3.axisBottom(xscale)
			.ticks(ticks)
			.tickFormat(function (d) {
				//return styleTicks(d, stream);
				var hrs = parseInt(d*(10**-9)/3600),
					mins = parseInt(d*(10**-9)/60) - hrs*60,
					secs = parseInt(d*(10**-9)).toFixed(2) - (mins*60 + hrs*3600)
					msecs = parseInt(d*(10**-6)).toFixed(3) - 1000*(secs + mins*60 + hrs*3600);
			 	return mins+":"+secs+"."+msecs;
			});

	axis(svg);
}

function styleTicks(d, stream) {
	//helper	
	function pad_zeros(num, size) {
	    var s = "000000000" + num;
	    return s.substr(s.length-size);
	}

	var all_secs = stream.stampsToSecs(d);
		mins = parseInt(all_secs/60),
		secs = parseInt(all_secs - mins*60);
		//msecs = parseInt(all_secs/1000) - 1000*(secs+mins*60);

	return mins+":"+pad_zeros(secs, 2);
}

function stampsToSecs(stream, t) {
	var data = stream.data,
		diff = max("t", data) - min("t", data);

	return d3.scaleLinear()
		.domain([min("t", data), max("t", data)])
		.range([0, diff*(10**-9)])(t);
}

function zoomed(stream, brush) {
	//Change the scale functions
	if (d3.event.sourceEvent && d3.event.sourceEvent.type === "brush") return;
	var pvals = d3.event.transform,
		half_dist = (pvals.k*stream.width*2)/2;

	var left = pvals.x-half_dist,
		right = pvals.x+half_dist;

	stream.hscale.range([left, right]);

	var scale = d3.scaleLinear()							
			.domain([pvals.x-half_dist, pvals.x+half_dist])				  	
			.range([0, stream.width]);

	//TODO: limit how small the brush can be
	var all_navs = d3.select(".right").selectAll("svg");

	//update brush position
	brush.move(stream.nav.svg, [scale(0), scale(stream.width)]);

	stream.axis.num_ticks = pvals.k*10;
	stream.update();
}

function brushed(stream, zoom) {
	//Change the scale functions
	if (d3.event.sourceEvent && d3.event.sourceEvent.type === "zoom") return;
	var brush_min = d3.event.selection[0],
		brush_max = d3.event.selection[1],
		half_width = stream.width/2,
		s = d3.event.selection;

	var scale = d3.scaleLinear()							
	 	.domain([brush_min, brush_max])				  	
	 	.range([0, stream.width]);

	stream.brush_coords = [brush_min, brush_max]; 
	stream.hscale.range([scale(0), scale(stream.width)]);
	
	//Update svg's zoom transform to show changes made by brush	
	var all_svgs = d3.select(".left").selectAll("svg");
	var all_navs = d3.select(".right").selectAll("svg");


	stream.svg.call(zoom.transform, d3.zoomIdentity
								.scale(half_width/(s[1]-s[0]))
								.translate(stream.width-2*s[0], 0)	
	);

	stream.axis.ticks = (half_width/(s[1]-s[0]))*10;
	stream.update();
}

function drawVideoLine(stream, nav=false) {
	//
	var data = stream.data,
		diff = max("t", data) - min("t", data);

	var scale =  d3.scaleLinear()
		.domain([min("t", data), max("t", data)])
		.range([0, diff*(10**-9)]);

	if (nav) {
		drawLine(stream.nav, scale.invert(stream.video_start));
		drawCurrentLine(stream.nav, scale.invert(stream.video_current));
		drawLine(stream.nav, scale.invert(stream.video_end));		
	} else {
		drawLine(stream, scale.invert(stream.video_start));
		drawCurrentLine(stream, scale.invert(stream.video_current));
		drawLine(stream, scale.invert(stream.video_end));		
	}
}

function drawCurrentLine(stream, x) {
	stream.svg.selectAll(".current-line").remove();
	stream.svg.append("line")
		.attr("class", "current-line")
		.attr("x1", stream.hscale(x))	
		.attr("y1", 0)
		.attr("x2", stream.hscale(x))	
		.attr("y2", stream.svg.attr("height")*3);
}

function drawLine(stream, x) {
	stream.svg.append("line")
		.attr("class", "red-line")
		.attr("x1", stream.hscale(x))	
		.attr("y1", 0)
		.attr("x2", stream.hscale(x))	
		.attr("y2", stream.svg.attr("height")*3);
}

function addStream(data_obj, dim_height, width) {
	//Necessary to initiate one 
	var	dims = Object.keys(data_obj.data[0]).slice(1, Object.keys(data_obj.data[0]).length),	
		num_dims = dims.length;

	var svg_nav = makeSvg(width, 30*num_dims, "right"),
		svg_main = makeSvg(width, dim_height*num_dims, "left");
		
	var stream = 
	{
		dim_height: dim_height,
		width: width,

		data: data_obj.data,
		svg: svg_main,
		hscale: d3.scaleLinear()							
			.domain( [min("t", data_obj.data), max("t", data_obj.data)] )				  	
			.range( [0, width] ),
		vscale: makeVerticalScale(data_obj.data, dim_height, 30),
		
		video_start: null,
		video_end: null,
		video_current: null,

		nav: {
			data: data_obj.data,			
			hscale: d3.scaleLinear()							
				.domain( [min("t", data_obj.data), max("t", data_obj.data)] )				  	
				.range( [0, width] ),
			vscale: makeVerticalScale(data_obj.data, 30, 5),			
			svg: svg_nav,
		},

		axis: {
			svg: makeSvg(width, 20, "left"),
			num_ticks: 10,
		},	

		update: function() {
			drawDim(this, dims[0]);

			for (i=1; i<dims.length; i++) {
				drawDim(this, dims[i], dim_height*i, false);				
			}

			drawAxis(this);		
			drawVideoLine(this);
			drawVideoLine(this, true);
		}	
	}

	//Nav section, drawn once
	drawDim(stream.nav, dims[0]);
	for (i=1; i<dims.length; i++) {
		drawDim(stream.nav, dims[i], 30*i, false);				
	}

	stream.update();

	var zoom;
	var brush;

	brush = d3.brushX()
		.on("brush", function() {
			brushed(stream, zoom)
		});


	zoom = d3.zoom()
		.on("zoom", function() {
			zoomed(stream, brush);
		});

	zoom(stream.svg);
	brush(stream.nav.svg);
	
	return stream;
}


