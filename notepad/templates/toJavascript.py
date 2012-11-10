#!/usr/bin/env python

import fileinput
import os
import glob
templates = []
output = open("templates.js", "w")

output.write("$.notepad = $.notepad || {};\n")
output.write("$.notepad.templates = $.notepad.templates || {};\n")

for file in glob.glob("*.sparql"):
	content = open(file, "r").read()
	content = content.replace(os.linesep, " \\n\\\n");
	content = content.replace('"', '\\"');
	output.write('\n')
	output.write('$.notepad.templates.' + file.replace(".sparql","") + ' = "' + content + '";')