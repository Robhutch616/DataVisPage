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
					secs = parseInt(d*(10**-9)).toFixed(2) - (mins*60 + hrs*3600),
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

function getIndexJustBeforeTval(a, tval, mid_pointer=a.length/2) {
	if (a.length === 2) {
		return a[0];
	}
	if (a.length === 3) {
		return a[0];		
	}
	var imid = Math.round(a.length/2),
		aleft = a.slice(0, imid+1),
		aright = a.slice(imid, a.length);

	if (tval < a[imid].t) return getIndexJustBeforeTval(aleft, tval, mid_pointer-aleft.length/2);
	else return getIndexJustBeforeTval(aright, tval, mid_pointer+aright.length/2);
}

function getBins(data, stream, dim, offset) {
	var hscale = stream.hscale,
		vscale = stream.vscale;
	var bins = {};
	
	var dist = stream.hscale.range()[1] - stream.hscale.range()[0];
	var step = Math.round(data.length/600);
	//console.log("step: "+step);
	if (step == 0) step = 1; 
	//step = 1;
	var i = 0;
	while (i<data.length) {
		var obj = data[i];
		var x = Math.round(hscale(obj.t));
		var	y = Math.round(vscale(obj[dim]));		
		//bins[x] = y+offset;
		bins[x] = bins[x] || {};
		bins[x][y+offset] = ++bins[x][y+offset] || 1;
		i = i + step;		
	}

	return bins;	
}

function zoomed(stream, brush) {
	var change_bin = true;
	//Change the scale functions
	if (d3.event.sourceEvent && d3.event.sourceEvent.type === "brush") return;
	//console.log(d3.event.sourceEvent.type);

	var pvals = d3.event.transform,
		half_dist = (pvals.k*stream.width*2)/2;

	var left = pvals.x-half_dist,
		right = pvals.x+half_dist;
	
	if ((stream.hscale.range()[1] - stream.hscale.range()[0]) !== (right - left)) change_bin = false;
	stream.hscale.range([left, right]);

	var scale = d3.scaleLinear()							
			.domain([pvals.x-half_dist, pvals.x+half_dist])				  	
			.range([0, stream.width]);

	//TODO: limit how small the brush can be
	var all_navs = d3.select(".right").selectAll("svg");

	//update brush position
	//brush.move(stream.nav.svg, [scale(0), scale(stream.width)]);

	stream.axis.num_ticks = pvals.k*10;
	if (change_bin) stream.update();
	else stream.update(false);
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


	// stream.svg.call(zoom.transform, d3.zoomIdentity
	// 							.scale(half_width/(s[1]-s[0]))
	// 							.translate(stream.width-2*s[0], 0)	
	// );

	stream.axis.ticks = (half_width/(s[1]-s[0]))*10;
	// stream.update();
}

function drawVideoLine(stream, nav=false) {
	//
	var data = stream.data,
		diff = max(data, "t") - min(data, "t");

	var scale =  d3.scaleLinear()
		.domain([min(data, "t"), max(data, "t")])
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

function addLineFuncs(stream) {
	stream.lines = [];
	stream.dims.map( function(dim, i) {
		stream.lines[dim] = d3.line()
			.x(function(d){ return stream.hscale(d.t) })
			.y(function(d){ return stream.vscale(d[dim])+i*stream.dim_height });
	});
}
