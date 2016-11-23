var textFile = null;
var makeTextFile = function (text) {
    var data = new Blob([text], {type: 'text/plain'});

    // If we are replacing a previously generated file we need to
    // manually revoke the object URL to avoid memory leaks.
    if (textFile !== null) {
        window.URL.revokeObjectURL(textFile);
    }

    textFile = window.URL.createObjectURL(data);

    // returns a URL you can use as a href
    return textFile;
};

//=================================================================

document.current_rect = null;
document.selected_rect = null;

var selected_object = null;

var timestamps = [];
var annotations = [];
var clicked = false;
var current_anno = null;
var current_label = 0;
var labels_string = "";

//Colours corresponding to labels
var colours_map = {
    "0":"maroon",
    "1":"yellowgreen",
    "2":"salmon",
    "3":"burlywood",
};

var s = new Stream(myo_accel_obj, 150, 900);
var g = s.display_main.select(".line-group");
var svg = s.display_main;

var key_svg = d3.select(".right").append("svg")
    .attr("width", 500)
    .attr("height", 300)
    .attr("class", "key-svg");

key_svg.append("text")
    .attr("class", "key-text")
    .text("Current label: "+current_label)
    .attr("x", 0)
    .attr("y", 35)
    .attr("font-size", 35);

key_svg.append("rect")
    .attr("class", "key-rect")
    .attr("x", 250)
    .attr("y", 5)
    .attr("width", 100)
    .attr("height", 35) 
    .style("fill", colours_map[current_label])
    .attr("opacity", 0.4);  


var output_button = d3.select(".right").append("button")
    .attr("id", "create")
    .text("Download labels"); 

output_button.node().addEventListener("click", function() {
    makeLabelsString();
    var link = document.createElement('a');
    link.setAttribute('download', 'labels.txt');
    link.href = makeTextFile(labels_string);
    document.body.appendChild(link);

    // wait for the link to be added to the document
    window.requestAnimationFrame(function () {
        var event = new MouseEvent('click');
        link.dispatchEvent(event);
        document.body.removeChild(link);
    });
}, false);

function makeLabelsString() {    
    labels_string = "";
    annotations.map(function(annotation) {
        var start = annotation.first_line.timestamp;
            finish = annotation.second_line.timestamp;

        // if (finish < start) {
        //     start = annotation.second_line.timestamp;
        //     finsh = annotation.first_line.timestamp;
        // }
        labels_string +=    start + " " +
                            finish + " " +
                            annotation.label + "\n";
    })
}

s.draw();

svg.on("click", function() {
    if (current_anno === null) {
        current_anno = new Annotation(s, d3.event, current_label);
    } else {
        current_anno = null;
    }
});

svg.on("mousemove", function() {    
    if (current_anno !== null) {
        current_anno.move(d3.event);
    }    
})

d3.select("body").on("keydown", function(){
    if (d3.event.key === "Delete") {selected_object.delete();}
    if (d3.event.code.includes("Digit")) {
        current_label = d3.event.key;
        d3.select(".key-text").text("Current label: "+current_label);
        d3.select(".key-rect").style("fill", colours_map[current_label]);
    }    
})


function Annotation(stream, click_event, text) {
    this.label = text;
    this.first_line = new AnnotationLine(stream, click_event, text);
    this.second_line = new AnnotationLine(stream, click_event, text);

    this.first_line.other_line = this.second_line;
    this.second_line.other_line = this.first_line;

    this.path = null;

    annotations.push(this);

    this.move = function(move_event) {
        this.second_line.x = (move_event.offsetX-stream.transform.x)/stream.transform.k;
        this.second_line.update(move_event.x); 
    }
}

function AnnotationLine(stream, click_event, label) {
    var this_line = this;
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
    
    var display_height = d3.select(".display-main").attr("height");

    this.update = function(timestamp_x) {
        //Remove old elements
        if (this.line != null) this.line.node().remove();
        if (this.mouseover_rect != null) this.mouseover_rect.node().remove();
        
        this.line = drawLine(s, this.x, "blue-line", true)
            .style("stroke", colours_map[this.label]);
        this.mouseover_rect = drawRect(this.x, 15, "line-rect");

        //Convert line x to timestamp
        var inv_scale = stream.hscale.invert(timestamp_x);
        this.timestamp = getIndexJustBeforeTval(stream.data_objs[0].data, inv_scale).t;    
        
        //Update timestamps
        var current_index = timestamps.indexOf(this);
        if (current_index > -1) timestamps.splice(current_index, 1);
        else current_index = timestamps.length; 
        timestamps.splice(current_index, 0, this);

        //Define mouse behaviour
        this.mouseover_rect.on("mouseover", function() {
            selected_object = this_line;
            this_line.line.style("stroke", "aqua")
                .style("stroke-width", "3px");
        });

        this.mouseover_rect.on("mouseout", function() {
            selected_object = null;
            this_line.line.style("stroke", colours_map[this_line.label])
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
                            [this.other_line.x, display_height], [this.x, display_height]  ];

        if (this.path !== null) this.path.node().remove();
        
        this.path = d3.select(".line-group").insert("path", ":first-child")
            .attr("d", line(path_data) + "Z")
            .style("fill", colours_map[this.label])
            .attr("opacity", "0.1")
            .attr("class", "anno-rect");                    
    }

    this.delete = function() {
        if (this.line != null) this.line.node().remove();
        if (this.mouseover_rect != null) this.mouseover_rect.node().remove();
        if (this.path != null) this.path.node().remove();

        //Convert line x to timestamp
        var current_index = timestamps.indexOf(this);
        if (current_index > -1) timestamps.splice(current_index, 1); 

        if (!this.deleted) {
            this.other_line.deleted = true;
            this.other_line.delete();            
        }
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




//Allows fetching video from youtube
videos = document.querySelectorAll("video");
for (var i = 0, l = videos.length; i < l; i++) {
    var video = videos[i];
    var src = video.src || (function () {
        var sources = video.querySelectorAll("source");
        for (var j = 0, sl = sources.length; j < sl; j++) {
            var source = sources[j];
            var type = source.type;
            var isMp4 = type.indexOf("mp4") != -1;
            if (isMp4) return source.src;
        }
        return null;
    })();
    if (src) {
        var isYoutube = src && src.match(/(?:youtu|youtube)(?:\.com|\.be)\/([\w\W]+)/i);
        if (isYoutube) {
            var id = isYoutube[1].match(/watch\?v=|[\w\W]+/gi);
            id = (id.length > 1) ? id.splice(1) : id;
            id = id.toString();
            var mp4url = "http://www.youtubeinmp4.com/redirect.php?video=";
            video.src = mp4url + id;
        }
    }
}