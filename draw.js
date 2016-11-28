var textFile = null;
var makeTextFile = function (text) {
    console.log(text);
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

//================================================================






//=================================================================
var files_contents = {};
var json_objs = [];
var stream = new Stream(100, 40, 900);

// Setup the drag and drop listeners.
var dataDrop = document.getElementById('data_drop');
dataDrop.addEventListener('dragover', handleDragOver, false);
dataDrop.addEventListener('drop', handleDataDrop, false);

var videoDrop = document.getElementById('video_drop');
videoDrop.addEventListener('dragover', handleDragOver, false);
videoDrop.addEventListener('drop', handleVideoDrop, false);


//===========================



//===========================



function updateStreamWith(files_contents) {
    var stream_data_objs = [];
    var event_timestamps = [];
    //Converts each file in files_contents to a json object
    //and pushes it to json_objs
    for (file_name in files_contents) {
        var raw_string = files_contents[file_name];
        var line_list = raw_string.split("\n");
        var split_line = line_list[0].split("\t");

        //if time events data (it only has one column)
        if (split_line.length === 1) {
            stream.time_events = line_list.map(function(t) { 
                var num = parseFloat(t)
                if (typeof(num) === "number") {return num;} 
            });
            // console.log(stream.time_events);
            continue;
        }

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
        stream_data_objs.push(json_obj);
    }   

    //Updates stream
    stream.data_objs = stream_data_objs;
    //cutoff lines are initialised and drawn

    var left_cutoff = new DraggableLine(stream, 50);
    var right_cutoff = new DraggableLine(stream, 350);
    left_cutoff.update();
    right_cutoff.update(); 
    stream.cutoff_lines = [left_cutoff, right_cutoff]


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

