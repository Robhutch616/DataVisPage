function makeDataset(num_points, range) {
	a = Array(num_points+1).fill(0);
	return a.map(
		function(e, i) {
			var x = i/num_points;
			return (range/2)*Math.sin(x*16*Math.PI);
		} 
	);	
}

function makeRandomDataset(num_points, range) {
	a = Array(num_points+1).fill(0);
	return a.map(function(e){return e+Math.random()*range});
}

function drawDataLine(svg, dataset, imin, imax) {
	var data_vals = Object.keys(dataset.data).map(function(key){return dataset.data[key].x});
	var	tmin = dataset.data[imin].t;
	var	tmax = dataset.data[imax-1].t;

	console.log(data_vals);
	var min_datum = Math.min(...data_vals);
		max_datum = Math.max(...data_vals);
	
	var x_scale = d3.scaleLinear()							
				.domain([imin, imax])				  	
				.range([0, svg.attr("width")]);			

	var y_scale = d3.scaleLinear()
				.domain([min_datum-10, max_datum+10])
				.range([svg.attr("height"), 0]);

	
	var line = d3.line()
		.x(function(d, i){ return x_scale(i) })
		.y(function(d){ return y_scale(d.x) });

	svg.append("path")
		.attr("class", "data-line")
		.attr("d", line(dataset.data));
}

function addBrush(svg_overview, svg_zoomed) {
	var t_vals = Object.keys(watch_data_object.data).map(function(key){return watch_data_object.data[key].t});
		t_abs_min = Math.min(t_vals);
		t_abs_max = Math.max(t_vals);

	//scale for svg_overview
	var x_scale = d3.scaleLinear()							
			.domain([0, watch_data_object.data.length])				  	
			.range([0, svg_overview.attr("width")]);
	
	var brush = d3.brushX()
		.on("brush", function() {
			svg_zoomed.selectAll(".data-line").remove();	
			var brush_min = d3.event.selection[0],
				brush_max = d3.event.selection[1],
				imin = Math.round(x_scale.invert(brush_min)),
				imax = Math.round(x_scale.invert(brush_max));
				imid = imin+Math.round((imax-imin)/2);
				
				updateCube(dataset.data[imid].x);
				
				updateAxis(svg_axis, imin, imax);
				drawDataLine(svg_zoomed, dataset, imin, imax); 			
		});
	brush(svg_overview);
}

function updateAxis(svg_axis, imin, imax) {
	var axis_scale = d3.scaleLinear()							
			.domain([watch_data_object.data[imin].t, watch_data_object.data[imax].t])				  	
			.range([0, svg_axis.attr("width")]);
	axis = d3.axisBottom(axis_scale);
	svg_axis.call(axis);	
}

function zoomed() {
	console.log(d3.event.transform);
}

function updateCube(val) {
	cube.position.x = val;
}


//////////////////////////////////////////////////

//watch_data_object.data = watch_data_object.data.slice(0, 200);

var svg_overview = d3.select(".overview");
var svg_zoomed = d3.select(".zoomed");

var zoom = d3.zoom()
	.on("zoom", zoomed);
svg_zoomed.call(zoom);

var num_points = 7000,
	range = 10,
	dataset = watch_data_object;

var red_line = svg_zoomed.append("line")
	.attr("x1", 300)
	.attr("y1", 0)
	.attr("x2", 300)
	.attr("y2", 400)
	.attr("class", "red-line");

var svg_axis = d3.select("body").append("svg")
    .attr("class", "axis")
    .attr("width", 600)
    .attr("height", 20)

drawDataLine(svg_overview, dataset, 0, dataset.data.length);  
addBrush(svg_overview, svg_zoomed);  

    

  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  