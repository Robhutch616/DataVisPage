var alphabet_list = "abcdefghijklmnopqrstuvwxyz".split("");

function min(data, dim) {
	function arrayMin(arr) {
	  	return arr.reduce(function (p, v) {
	    	return ( p < v ? p : v );
	  	});
	}

	//Gets the minimum dim from an array of readings (data)
	var vals = data.map( function(obj){return parseFloat(obj[dim])} );
	return arrayMin(vals);
}

function max(data, dim) {
	function arrayMax(arr) {
	  	return arr.reduce(function (p, v) {
	    	return ( p > v ? p : v );
	  	});
	}
	var vals = data.map( function(obj){ return parseFloat(obj[dim])} );
	return arrayMax(vals);
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

//Appends svg to div of div_class
function makeSvg(width, height, div_class, svg_class) {
	return svg_axis = d3.select("."+div_class).append("svg")
		.attr("width", width)
		.attr("height", height)
		.attr("class", svg_class);
}

//Makes timescale based on max t and min t in data
function makeTimeScale(data_objs, svg) {
	var mints = data_objs.map( function(obj){return min(obj.data, "t")} ),
		maxts = data_objs.map( function(obj){return max(obj.data, "t")} ),
		mint = Math.min(...mints),
		maxt = Math.max(...maxts);

	return d3.scaleTime()
		.domain( [new Date(mint), new Date(maxt)] )
		.range( [0, svg.attr("width")] );
}

function makeVertScale(obj, upper_pixels) {
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
		.range([0, upper_pixels]);
	
	obj.vscale = vscale;
}

function redrawVideoTime() {
	var tval = parseFloat(d3.select(".text-input").node().value);
	//Update stream video properties
	stream.video_start = tval;
	stream.video_end = tval+stream.video.duration*Math.pow(10,3);
	
	//Remove all current video time lines
	d3.selectAll(".red-line").nodes().map(function(node){node.remove()});
	
	if (tval !== undefined && stream.display_main !== null && tval !== NaN) {
		drawLine(stream, stream.video_start);
		drawLine(stream, stream.video_end);
	}
}

function addVideo(src, stream, video_start_epoch) {
	var video = d3.select(".right").insert("video", ":first-child")
		.attr("src", src)
		.attr("width", 600)
		.attr("controls", 1)
		.node();

	stream.video = video;

	var video_start_input = d3.select(".right").insert("input", ":first-child")
		.attr("class", "text-input")
		.attr("type", "text")
		.attr("id", "video_start_input")
		.attr("oninput", "redrawVideoTime()");

	var video_start_label = d3.select(".right").insert("label", ":first-child")
		.attr("for", "video_start_input")
		.text("Enter video start timestamp: ");


	video.onloadedmetadata = function() {
		stream.video_start = video_start_epoch;
		stream.video_end = video_start_epoch+video.duration*Math.pow(10,3);
		redrawVideoTime();
	};

	video.ontimeupdate = function() {
		stream.video_current = stream.video_start+video.currentTime*Math.pow(10, 3);
		if (stream.display_main !== null) {
			drawLine(stream, stream.initial_hscale(stream.video_current), "rm", true);
		}
	};
}

function drawDataObj(stream, obj, offset) {
	obj.dims.map( function(dim, i) {
		var pixel_range = obj.vscale.range()[1] - obj.vscale.range()[0];
		drawDataObjDim(stream, obj, dim, offset+i*pixel_range);
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

	stream.display_main.select(".line-group")
		.append("line")
		.attr("vector-effect", "non-scaling-stroke")
		.attr("class", "zero-line")
		.attr("x1", 0)
		.attr("x2", 900)
		.attr("y1", obj.vscale(0)+offset)
		.attr("y2", obj.vscale(0)+offset);	

	// stream.display_main.select(".line-group")
	// 	.append("line")
	// 	.attr("vector-effect", "non-scaling-stroke")
	// 	.attr("class", "boundary-line")
	// 	.attr("x1", 0)
	// 	.attr("x2", 900)
	// 	.attr("y1", obj.vscale.range()[0]+offset)
	// 	.attr("y2", obj.vscale.range()[0]+offset);

	// stream.display_main.select(".line-group")
	// 	.append("line")
	// 	.attr("vector-effect", "non-scaling-stroke")
	// 	.attr("class", "boundary-line")
	// 	.attr("x1", 0)
	// 	.attr("x2", 900)
	// 	.attr("y1", obj.vscale.range()[1]+offset)
	// 	.attr("y2", obj.vscale.range()[1]+offset);
}

function zoom_group(stream) {
	var transform = d3.event.transform;
	var g = stream.display_main.select(".line-group");

	//Limit translating
	if (transform.x > 10) transform.x = 10;	
	else if (transform.x/transform.k < -stream.width) transform.x = -stream.width*transform.k;

	//Changing scale
	stream.hscale.range([transform.x, transform.x+(stream.width*transform.k)]);

	//Saving current transform 	
	stream.transform = transform;

	//Transform line group by current event transform 
	g.attr("transform", "translate(" + transform.x + "," + 0 + ") scale(" + transform.k + "," + 1 + ")");
	stream.updateAxis();
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

function Annotation(stream, click_event, text) {
    this.label = text;
    this.first_line = new AnnotationLine(stream, click_event, text, this);
    this.second_line = new AnnotationLine(stream, click_event, text, this);

    this.first_line.other_line = this.second_line;
    this.second_line.other_line = this.first_line;

    this.path = null;

    stream.annotations.push(this);

    this.move = function(move_event) {
        this.second_line.x = (move_event.offsetX-stream.transform.x)/stream.transform.k;
        this.second_line.update(move_event.x); 
    }
}

function AnnotationLine(stream, click_event, label, parent_annotation) {
    var this_line = this;
    //So that when the line is deleted its Annotation() is too
    this.annotation = parent_annotation;
    
    this.label = label;
    this.x = (click_event.offsetX-stream.transform.x)/stream.transform.k;
    this.timestamp = null;
    this.line = null;
    this.other_line = null;
    //Rectangle between two annotation lines
    this.path = null;
    //Flag to prevent infinite loop when deleting
    this.deleted = false;
    //Draw a rectangle around the line to make it easier to mouse over it
    this.mouseover_rect = null;
    
    var display_height = stream.display_main.attr("height");

    this.update = function(timestamp_x) {
        //Remove old elements
        if (this.line != null) this.line.node().remove();
        if (this.mouseover_rect != null) this.mouseover_rect.node().remove();
        
        this.line = drawLine(stream, this.x, "blue-line", true)
            .style("stroke", stream.colours_map[this.label]);
        this.mouseover_rect = drawRect(this.x, 15, "line-rect");

        //Convert line x to timestamp
        var inv_scale = stream.hscale.invert(timestamp_x);
        this.timestamp = getIndexJustBeforeTval(stream.data_objs[0].data, inv_scale).t;    
        
        //Attach mouse event listeners
        this.mouseover_rect.on("mouseover", function() {
            stream.selected_line = this_line;
            this_line.line.style("stroke", "aqua")
                .style("stroke-width", "3px");
        });

        this.mouseover_rect.on("mouseout", function() {
            stream.selected_line = null;
            this_line.line.style("stroke", stream.colours_map[this_line.label])
            .style("stroke-width", "1px");            
        });
        this.mouseover_rect.call(d3.drag().on("drag", function() {
            this_line.x = d3.event.x;
            this_line.update(d3.event.sourceEvent.x);
        }));

        //Draw annotation rectangle
        if (this.other_line !== null) {
            this.drawPathRect();
            this.other_line.drawPathRect();
        }
    }

    this.drawPathRect = function() {
        var line = d3.line()
            .x(function(d){ return d[0] })
            .y(function(d){ return d[1] });

        var path_data = [   [this.x, 0], [this.other_line.x, 0], 
                            [this.other_line.x, parseInt(display_height)], [this.x, parseInt(display_height)]  ];

        if (this.path !== null) this.path.node().remove();
        
        this.path = d3.select(".line-group").insert("path", ":first-child")
            .attr("d", line(path_data) + "Z")
            .style("fill", stream.colours_map[this.label])
            .attr("opacity", "0.2")
            .attr("class", "anno-rect");                    
    }

    this.delete = function() {
        if (this.line != null) this.line.node().remove();
        if (this.mouseover_rect != null) this.mouseover_rect.node().remove();
        if (this.path != null) this.path.node().remove();

        if (!this.deleted) {
            this.other_line.deleted = true;
            this.other_line.delete();            
        }

        var anno_index = stream.annotations.indexOf(this.annotation);
        if (anno_index !== -1) {stream.annotations.splice(anno_index, 1)};
    }

    this.update(click_event.offsetX);
}

function drawRect(center_x, width, rect_class) {
    //Draws mouseover rect
    //The rectangle is actually a thick line to allow non-scaling-strooke
    var rect = d3.select(".line-group").append("line")
        .attr("x1", center_x)
        .attr("y1", 0)
        .attr("x2", center_x)
        .attr("y2", d3.select(".display-main").attr("height"))
        .attr("vector-effect", "non-scaling-stroke")
        .attr("class", rect_class)
        .attr("opacity", "0")
        .style("stroke-width", 2*width)
        .style("stroke", "blue")
        .style("fill", "transparent");
    return rect;
}

function createStatusSvg(stream) {
	var key_svg = d3.select(".right").append("svg")
        .attr("width", 500)
        .attr("height", 50)
        .attr("class", "key-svg");

    key_svg.append("text")
        .attr("class", "key-text")
        .text("Current label: "+stream.current_label)
        .attr("x", 8)
        .attr("y", 25)
        .attr("font-size", 25);

    key_svg.append("rect")
        .attr("class", "key-rect")
        .attr("x", 250)
        .attr("y", 5)
        .attr("width", 100)
        .attr("height", 35) 
        .style("fill", stream.colours_map[stream.current_label])
        .attr("opacity", 0.4);  
}

function bindKeyListeners(stream) {
	d3.select("body").on("keydown", function(){
        if (d3.event.key === "Delete") {
        	stream.selected_line.delete();
        }
        if (d3.event.code.includes("Digit")) {
            stream.current_label = d3.event.key;
            d3.select(".key-text").text("Current label: "+stream.current_label);
            d3.select(".key-rect").style("fill", stream.colours_map[stream.current_label]);
        }    
    })
}

function bindMouseListeners(stream) {
    stream.display_main.on("click", function() {
        if (stream.current_anno === null) {
            stream.current_anno = new Annotation(stream, d3.event, stream.current_label);
        } else {
            stream.current_anno = null;
        }
    });

    stream.display_main.on("mousemove", function() {    
        if (stream.current_anno !== null) {
            stream.current_anno.move(d3.event);
        }    
    });	

    var zoom;
	zoom = d3.zoom()
		.scaleExtent([1, 600])
		.on("zoom", function() {
			zoom_group(stream);				
		});
	
	zoom(stream.display_main);
}


function makeLabelsString(stream) {    
    var labels_string = "";
    console.log("making string...")
    stream.annotations.map(function(annotation) {
        var start = parseFloat(annotation.first_line.timestamp),
            finish = parseFloat(annotation.second_line.timestamp);

    	//Make sure start comes before finish in text file
        if (finish < start) {
	        labels_string += finish+" "+start+" "+annotation.label+"\n";
        } else {
        	labels_string += start+" "+finish+" "+annotation.label+"\n";
        }
    })
    
    return labels_string;
}

function createOutputButton(stream) {
	var output_button = d3.select(".right").append("button")
        .attr("id", "create")
        .text("Download labels"); 

    output_button.node().addEventListener("click", function() {
        var link = document.createElement('a');
        link.setAttribute('download', 'labels.txt');
        link.href = makeTextFile(makeLabelsString(stream));
        document.body.appendChild(link);

        // wait for the link to be added to the document
        window.requestAnimationFrame(function () {
            var event = new MouseEvent('click');
            link.dispatchEvent(event);
            document.body.removeChild(link);
        });
    }, false);
}

function updatePropsFromDataObjs(stream) {
	stream.display_main.node().remove();
	stream.selected_line = null;
	stream.annotations = [];
	stream.current_anno = null;
	stream.clicked = false;
	stream.current_label = 0;

	var total_dims = 0
	stream.data_objs.map(function(obj) {
		total_dims += obj.dims.length;
	});

	stream.transform = {x:0, k:1};
	stream.display_main = makeSvg(stream.width, stream.dim_height*total_dims+stream.between_objs*stream.data_objs.length, "left", "display-main");
	stream.initial_hscale = makeTimeScale(stream.data_objs, stream.display_main);

	// this.axis = d3.axisBottom(this.hscale);
	// this.display_axis = makeSvg(width, 30, "left", "axis");

	stream.hscale = makeTimeScale(stream.data_objs, stream.display_main);

	//Put vertical scales into data objects and assign transformation group
	stream.data_objs.map( function(obj) {makeVertScale(obj, stream.dim_height)} );
	stream.display_main.append("g").attr("class", "line-group");

	bindKeyListeners(stream);
	bindMouseListeners(stream);
}

function drawGrid(stream) {
	var x_coords = Array.apply(null, {length: 400}).map(Number.call, Number);
	var y_coords = Array.apply(null, {length: 20}).map(Number.call, Number);
	x_coords = x_coords.map(function(n) { return n*(3*stream.display_main.attr("width")/300) });
	y_coords = y_coords.map(function(n) { return n*(stream.display_main.attr("height")/20) });
	//Draw horizontal lines
	stream.display_main.select(".line-group").selectAll()
		.data(x_coords)
	.enter().insert("line", ":first-child")
		.attr("x1", function(d){return d})
		.attr("y1", 0)
		.attr("x2", function(d){return d})
		.attr("y2", stream.display_main.attr("height"))
		.attr("class", "grid-line")
		.attr("vector-effect", "non-scaling-stroke");

	//Draw vertical lines
	// stream.display_main.select(".line-group").selectAll()
	// 	.data(y_coords)
	// .enter().insert("line", ":first-child")
	// 	.attr("x1", 0)
	// 	.attr("y1", function(d){return d})
	// 	.attr("x2", stream.display_main.attr("width")*3)
	// 	.attr("y2", function(d){return d})
	// 	.attr("class", "grid-line")
	// 	.attr("vector-effect", "non-scaling-stroke");
}

function drawTimeEvents(stream) {
	console.log(stream.time_events);
	stream.time_events.map(function(t) {
		drawLine(stream, t, "event-line");
	})
}

//==============================================================================













//==============================================================================

function Stream(dim_height, between_objs, width) {	
	//A list of all annotations on the screen
	this.annotations = [];
	//A reference to the Annotation() being drawn
	this.current_anno = null;
	//Has the main display been clicked? Used to draw annotations
	this.clicked = false;
	//The label of the annotation to be drawn
	this.current_label = 0;
	//Colours corresponding to labels
	this.colours_map = {
	    "0":"maroon",
	    "1":"yellowgreen",
	    "2":"salmon",
	    "3":"burlywood"
	};

	//A list of the data objects: text data converted to json
	this.data_objs = [];
	this.time_events = [];

	//helper counter, only used to work out height of svg
	var total_dims = 0
	this.data_objs.map(function(obj) {
		total_dims += obj.dims.length;
	});

	//Width of the svg
	this.dim_height = dim_height;
	this.between_objs = between_objs;
	this.width = width;
	this.transform = {x:0, k:1};
	this.display_main = makeSvg(width, dim_height*total_dims+between_objs*this.data_objs.length, "left", "display-main");
	this.initial_hscale = makeTimeScale(this.data_objs, this.display_main);

	this.hscale = makeTimeScale(this.data_objs, this.display_main);

	this.axis = d3.axisBottom(this.hscale);
	this.display_axis = makeSvg(width, 30, "left", "axis");

	this.video_start = null;
	this.video_current = null;
	this.video_end = null;

	this.update = function() {
		updatePropsFromDataObjs(this);

		//Draw each dimension
		var obj_offset = 0;
		for (i in this.data_objs) {
			drawDataObj(this, this.data_objs[i], obj_offset);
			obj_offset += this.data_objs[i].dims.length * this.data_objs[i].vscale.range()[1]+this.between_objs;
		}

		drawTimeEvents(this);
		this.axis = d3.axisBottom(this.hscale);
		this.updateAxis();
		drawGrid(this);
	}

	this.updateAxis = function() {
		//A white rectangle is painted first on display_axis 
		//removed on each update 
		if (this.display_axis.select(".white-rect").node() !== null) {
			this.display_axis.select(".white-rect").node().remove()
		};
		this.display_axis.insert("rect", ":first-child")
			.attr("x", 0)
			.attr("y", 0)
			.attr("width", this.display_axis.attr("width"))
			.attr("height", this.display_axis.attr("height"))
			.attr("class", "white-rect");

		//TODO modify a copy of hscale when transforming, use it for ticks
		
		//num_ticks is calculated
		var hscale_range = this.hscale.range()[1] - this.hscale.range()[0];
		var num_ticks = hscale_range/160; 
		if (num_ticks > 400) {num_ticks = 400};
		this.axis.ticks(num_ticks);

		//axis is rendered to current display_axis
		this.axis(this.display_axis);
	}

	//add a vertical scale to each data object
	this.data_objs.map( function(obj) {makeVertScale(obj, dim_height)} );
	this.display_main.append("g").attr("class", "line-group");

	// this.update_axis();

	//Independent of data
	createStatusSvg(this);	
	createOutputButton(this);

	bindKeyListeners(this);
	bindMouseListeners(this);
	
	//addVideo("AntonPhysio/17_11_16/3/VIDEO_17-11-16_10-19-55-188.mp4", this, 1479378002766);

	// plotTimeEvents(this, [
	// 	1479377935295,
	// 	1479377939007,
	// 	1479378002766,
	// 	1479378112028,
	// 	1479378115467,
	// 	1479378134858,
	// 	1479378154917,
	// 	1479378193385,
	// 	1479378226502,
	// 	1479378236816,
	// 	1479378267359,
	// 	1479378314143,
	// 	1479378343105,
	// 	1479378383145,
	// 	1479378415500,
	// 	1479378448909,
	// 	1479378479190,
	// 	1479378560226,
	// 	1479378590144,
	// 	1479378674668,
	// 	1479378701081,
	// 	1479378772511,
	// 	1479378799701,
	// 	1479378839306,
	// 	1479378865370,
	// 	1479378933775,
	// 	1479378974632,
	// 	1479378998097,
	// 	1479379029372,
	// 	1479379050862,
	// 	1479379094948,
	// 	1479379109854
	// ]);
}




