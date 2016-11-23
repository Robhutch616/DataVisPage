function plotTimeEvents(stream, timestamps) {
	timestamps.map( function(t) {
		drawLine(stream, t, "orange-line");
	})
}

function min(data, dim) {
	function arrayMin(arr) {
	  	return arr.reduce(function (p, v) {
	    	return ( p < v ? p : v );
	  	});
	}
	//Gets the minimum dim from an array of readings (data)
	var vals = data.map( function(obj){return obj[dim]} );
	return arrayMin(vals);
}

function max(data, dim) {
	function arrayMax(arr) {
	  	return arr.reduce(function (p, v) {
	    	return ( p > v ? p : v );
	  	});
	}
	var vals = data.map( function(obj){ return obj[dim]} );
	return arrayMax(vals);
}

function makeSvg(width, height, div_class, svg_class) {
	return svg_axis = d3.select("."+div_class).append("svg")
		.attr("width", width)
		.attr("height", height)
		.attr("class", svg_class);
}

function clear() {
	s.display_main.selectAll(".blue-line").remove();
	timestamps = [];
}

function makeTimeScale(data_objs, svg) {
	var mints = data_objs.map( function(obj){return min(obj.data, "t")} ),
		maxts = data_objs.map( function(obj){return max(obj.data, "t")} ),
		mint = Math.min(...mints),
		maxt = Math.max(...maxts);

	return d3.scaleTime()
		.domain( [new Date(mint), new Date(maxt)] )
		.range( [0, svg.attr("width")] );
}

function makeVertScale(obj) {
	var mindims = [],
		maxdims = [];
	obj.dims.map(function(dim) {
		mindims.push( min(obj.data, dim) );
		maxdims.push( max(obj.data, dim) );
	})

	var very_min = Math.min(...mindims),
		very_max = Math.max(...maxdims);

	var vscale = d3.scaleLinear()
		.domain([very_min, very_max])
		.range([0, 100]);

	obj.vscale = vscale;
}

function addVideo(src, stream, video_start_epoch) {
	var video = d3.select(".right").insert("video", ":first-child")
		.attr("src", src)
		.attr("width", 600)
		.attr("controls", 1)
		.node();

	video.onloadedmetadata = function() {
		stream.video_start = video_start_epoch;
		stream.video_end = video_start_epoch+video.duration*(10**3);
		drawLine(stream, stream.video_start);
		drawLine(stream, stream.video_end);
	};

	video.ontimeupdate = function() {
		//console.log(video.currentTime);
		stream.video_current = video_start_epoch+video.currentTime*(10**3);
		drawLine(stream, stream.initial_hscale(stream.video_current), "rm", true);
	};
}

function drawDataObj(stream, obj, offset) {
	obj.dims.map( function(dim, i) {
		drawDataObjDim(stream, obj, dim, offset+i*obj.vscale.range()[1]+10);
	})
}

function drawDataObjDim(stream, obj, dim, offset, rm=true) {
	var line = d3.line()
		.x(function(d){ return stream.hscale(d.t) })
		.y(function(d){ return obj.vscale(d[dim])+offset });

	stream.display_main.select(".line-group")
		.append("path")
		.attr("vector-effect", "non-scaling-stroke")
		.attr("class", "data-line "+dim)
		.attr("d", line( obj.data ));	
}

function zoom_group(stream) {
	var transform = d3.event.transform;
	var g = stream.display_main.select(".line-group");

	//Limit translating
	//console.log(transform.x, transform.x/transform.k);

	if (transform.x > 10) transform.x = 10;	
	else if (transform.x/transform.k < -stream.width) transform.x = -stream.width*transform.k;

	//Changing scale
	stream.hscale.range([transform.x, transform.x+(stream.width*transform.k)]);

	//Saving current transform 	
	stream.transform = transform;

	//Transform line group by current event transform 
	g.attr("transform", "translate(" + transform.x + "," + 0 + ") scale(" + transform.k + "," + 1 + ")");
	stream.update_axis();
}

function drawLine(stream, x, css_class="red-line", use_actual_x=false) {
	stream.display_main.selectAll(".rm").remove();

	var g = stream.display_main.select(".line-group");
	var line = null;
	if (!use_actual_x) {
		line = g.append("line")
			.attr("class", css_class)
			.attr("vector-effect", "non-scaling-stroke")
			.attr("x1", stream.hscale(x))	
			.attr("y1", 0)
			.attr("x2", stream.hscale(x))	
			.attr("y2", stream.display_main.attr("height")*3);
	} else {
		line = g.append("line")
			.attr("class", css_class)
			.attr("vector-effect", "non-scaling-stroke")
			.attr("x1", x)	
			.attr("y1", 0)
			.attr("x2", x)	
			.attr("y2", stream.display_main.attr("height")*3);
	}

	return line;
}

function associateBehaviors(stream) {
	var zoom;

	zoom = d3.zoom()
		.scaleExtent([1, 600])
		.on("zoom", function() {
			zoom_group(stream);				
		});
	
	zoom(stream.display_main);

	document.addEventListener("mousedown", function() {
		if (event.altKey) stream.display_main.on(".zoom", null);
	}, true);

	document.addEventListener("mouseup", function() {
		if (event.altKey) {
			zoom(stream.display_main);
		}	
	}, true);
}

function Stream(data_obj, dim_height, width, implementation="svg") {
	//A list of all the column names except t
	dims = Object.keys(data_obj.data[5]);
	var t_index = dims.indexOf("t");
	dims.splice(dims.indexOf("t"), 1);
	
	//Define stream properties
	this.width = width;

	this.transform = {x:0, k:1};

	this.display_main = implementation === "svg" ? 
		makeSvg(width, dim_height*14, "left", "display-main")
		: makeCanvas(width, dim_height*this.dims.length, "left");
	
	this.initial_hscale = d3.scaleLinear()							
		.domain( [min(data_obj.data, "t"), max(data_obj.data, "t")] )				  	
		.range( [0, width] );

	this.axis = d3.axisBottom(this.hscale);
	this.display_axis = makeSvg(width, 30, "left", "axis");

	this.data_objs = [myo_accel_obj, watch_obj]; //also myo_emg_obj
	this.hscale = makeTimeScale(this.data_objs, this.display_main);

	this.video_start = null;
	this.video_current = null;
	this.video_end = null;

	this.draw = function() {
		var dims = 0;
		var obj_offset = 0;
		for (i in this.data_objs) {
			drawDataObj(this, this.data_objs[i], obj_offset);
			obj_offset += this.data_objs[i].dims.length * this.data_objs[i].vscale.range()[1]+10;
		}
	}

	this.update_axis = function() {
		var hscale_range = this.hscale.range()[1] - this.hscale.range()[0];
		var num_ticks = hscale_range/180; 
		if (num_ticks > 550) num_ticks = 550;
		this.axis = d3.axisBottom(this.hscale)
			.ticks(num_ticks);
			
		this.axis(this.display_axis);
	}

	this.display_axis.insert("rect", ":first-child")
		.attr("x", 0)
		.attr("y", 0)
		.attr("width", this.display_axis.attr("width"))
		.attr("height", this.display_axis.attr("height"))
		.attr("fill", "rgb(255, 255, 255)");

	//add a vertical scale to each data object
	this.data_objs.map( function(obj) {makeVertScale(obj)} );
	this.display_main.append("g").attr("class", "line-group");

	this.update_axis();
	//add zoom behaviour 	
	associateBehaviors(this);

	addVideo("AntonPhysio/17_11_16/3/VIDEO_17-11-16_10-19-55-188.mp4", this, 1479378002766);

	plotTimeEvents(this, [
		1479377935295,
		1479377939007,
		1479378002766,
		1479378112028,
		1479378115467,
		1479378134858,
		1479378154917,
		1479378193385,
		1479378226502,
		1479378236816,
		1479378267359,
		1479378314143,
		1479378343105,
		1479378383145,
		1479378415500,
		1479378448909,
		1479378479190,
		1479378560226,
		1479378590144,
		1479378674668,
		1479378701081,
		1479378772511,
		1479378799701,
		1479378839306,
		1479378865370,
		1479378933775,
		1479378974632,
		1479378998097,
		1479379029372,
		1479379050862,
		1479379094948,
		1479379109854
	]);
}




