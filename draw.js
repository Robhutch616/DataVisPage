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
var files_contents = {};
var json_objs = [];
var stream = new Stream(json_objs, 100, 40, 900);

// Setup the drag and drop listeners.
var dataDrop = document.getElementById('data_drop');
dataDrop.addEventListener('dragover', handleDragOver, false);
dataDrop.addEventListener('drop', handleDataDrop, false);

var videoDrop = document.getElementById('video_drop');
videoDrop.addEventListener('dragover', handleDragOver, false);
videoDrop.addEventListener('drop', handleVideoDrop, false);

function updateStreamWith(files_contents) {
    json_objs = [];
    //Converts each file in files_contents to a json object
    //and pushes it to json_objs
    for (file_name in files_contents) {
        raw_string = files_contents[file_name];
        line_list = raw_string.split("\n");

        var json_obj = {
            "dims": alphabet_list.slice(0, line_list[0].split("\t").length - 1),
            "data": []
        };

        line_list.map(function(line) {
            split_line = line.split("\t");
            var reading = {};
            var dont_push = false;
            for (i in split_line) {
                if (i != split_line.length-1) {
                    reading[json_obj.dims[i]] = split_line[i];
                } else {
                    dont_push = split_line[i] == 0; 
                    reading["t"] = split_line[i];
                }
            }
            
            if (!dont_push) {
                json_obj["data"].push(reading)
            }
        });
        json_objs.push(json_obj);
    }   

    //Updates stream
    stream.data_objs = json_objs;
    stream.update();
}

function handleDataDrop(evt) {
    evt.stopPropagation();
    evt.preventDefault();

    files_contents = {};
    document.file_index_list = [];
    //FileList object
    var files = evt.dataTransfer.files; 

    for (var i=0; i<files.length; i++) {
        //Go through every dropped file, read its contents with a FileReader() 
        var f = files[i];

        //Each file has a reader
        var reader = new FileReader();
        
        //Save some properties into the file's reader
        //to detect when last file has been loaded
        reader.filename = f.name;
        reader.files_length = files.length;
        reader.curr_index = i;

        //Gets executed when the reader finishes loading in the file's content
        reader.onloadend = function() {
            //Files' contents get saved to a global var files_contents 
            files_contents[this.filename] = this.result;
            document.file_index_list.push([this.curr_index]);
            
            //When the last file has been loaded...
            if (document.file_index_list.length == files.length) {
                updateStreamWith(files_contents);
            }
        };

        reader.readAsText(f);   
    };
}

function handleVideoDrop(evt) {
    evt.stopPropagation();
    evt.preventDefault();

    var files = evt.dataTransfer.files; // FileList object.

    // files is a FileList of File objects. List some properties.
    var output = [];
    for (var i = 0, f; f = files[i]; i++) {
        addVideo(window.URL.createObjectURL(f), stream, 1479378002766);
    }
}

function handleDragOver(evt) {
    evt.stopPropagation();
    evt.preventDefault();
    evt.dataTransfer.dropEffect = 'copy'; // Explicitly show this is a copy.
}


function parseJsons(jsons) {
    for (var filename in jsons) {
        json_objs.push(JSON.parse(jsons[filename]));
    }
}

// function textToJson(files_contents) {
//     for (name in files_contents) {
//         raw_string = files_contents[name];
//         line_list = raw_string.split("\n");

//         var json_obj = {
//             "dims": alphabet_list.slice(0, line_list[0].split("\t").length - 1),
//             "data": []
//         };

//         line_list.map(function(line) {
//             split_line = line.split("\t");
//             var reading = {};
//             var dont_push = false;
//             for (i in split_line) {
//                 if (i != split_line.length-1) {
//                     reading[json_obj.dims[i]] = split_line[i];
//                 } else {
//                     dont_push = split_line[i] == 0; 
//                     reading["t"] = split_line[i];
//                 }
//             }
            
//             if (!dont_push) {
//                 json_obj["data"].push(reading)
//             }
//         });
//         json_objs.push(json_obj);
//     }

//     //Draw stream
//     var s = new Stream(json_objs, 150, 40, 900);
//     var g = s.display_main.select(".line-group");
//     var svg = s.display_main;

//     s.update();

//     svg.on("click", function() {
//         if (current_anno === null) {
//             current_anno = new Annotation(s, d3.event, current_label);
//         } else {
//             current_anno = null;
//         }
//     });

//     svg.on("mousemove", function() {    
//         if (current_anno !== null) {
//             current_anno.move(d3.event);
//         }    
//     });

//     d3.select("body").on("keydown", function(){
//         if (d3.event.key === "Delete") {selected_object.delete();}
//         if (d3.event.code.includes("Digit")) {
//             current_label = d3.event.key;
//             d3.select(".key-text").text("Current label: "+current_label);
//             d3.select(".key-rect").style("fill", colours_map[current_label]);
//         }    
//     })

//     var key_svg = d3.select(".right").append("svg")
//         .attr("width", 500)
//         .attr("height", 300)
//         .attr("class", "key-svg");

//     key_svg.append("text")
//         .attr("class", "key-text")
//         .text("Current label: "+current_label)
//         .attr("x", 0)
//         .attr("y", 35)
//         .attr("font-size", 35);

//     key_svg.append("rect")
//         .attr("class", "key-rect")
//         .attr("x", 250)
//         .attr("y", 5)
//         .attr("width", 100)
//         .attr("height", 35) 
//         .style("fill", colours_map[current_label])
//         .attr("opacity", 0.4);  


//     var output_button = d3.select(".right").append("button")
//         .attr("id", "create")
//         .text("Download labels"); 

//     output_button.node().addEventListener("click", function() {
//         makeLabelsString();
//         var link = document.createElement('a');
//         link.setAttribute('download', 'labels.txt');
//         link.href = makeTextFile(labels_string);
//         document.body.appendChild(link);

//         // wait for the link to be added to the document
//         window.requestAnimationFrame(function () {
//             var event = new MouseEvent('click');
//             link.dispatchEvent(event);
//             document.body.removeChild(link);
//         });
//     }, false);

// }




