import json
text_file = open("watch_data-14-09-16-13.txt", "r")
json_file = open("watch_data-14-09-16-13.js", "w")
json_string = '{"data":[';

t_prev = 0
for line in text_file:	 
	line_list = line.split();
	x = line_list[0]
	y = line_list[1]
	z = line_list[2]
	t = line_list[3]
	#print int(t_prev)/(10**6)-int(t)/(10**6)
	print int(t)/(10**6)
	t_prev = line_list[3]

	json_string += '{' + '"x":'+x+',' + '"y":'+y+',' + '"z":'+z+',' + '"t":'+t+'},'

#Remove last comma
json_string = json_string[:-1]

json_string += "]}"

#Format json
parsed = json.loads(json_string)
pretty_json_string = json.dumps(parsed, indent=4, sort_keys=True);

json_file.write("var data_obj = ")
json_file.write(pretty_json_string)
json_file.close()

