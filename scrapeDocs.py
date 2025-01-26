import re
import json
from pathlib import Path
import copy

def scrapeFile(path):
    dict = {"EXT_ATTRIBUTES":{},
            "EXT_STATIC_ATTRIBUTES":{},
            "EXT_METHODS":{},
            "EXT_STATIC_METHODS":{},
            "EXT_FUNCTIONS":{}}
    header = {}
    with open(path) as sourceFile:
        html = sourceFile.read()
        pattern = r'(class="py .*\n.*\n.*desc.*pre">.*?<)'
        prePattern = r'(?<="pre">)(.*?)(?=<)'
        retPattern = r'(?<=<p>)(.*?)(?=<)'
        typePattern = r'(?<=title=")(.*?)(?=")'
        pyChildren = re.findall(pattern, html, re.MULTILINE)
        for i in pyChildren:
            htmlSlice = html[html.find(i)+len(i):]
            htmlSlice = htmlSlice[:htmlSlice.find("</dl>")]
            typeSlice = htmlSlice[htmlSlice.find("Type"):]
            retSlice = htmlSlice[htmlSlice.find("Return type"):]
            if "py attribute" in i:
                match = re.findall(prePattern, i)[0]
                if ('<p>enum in [' in typeSlice):
                    enumSlice = re.search(r'(?<=enum in \[).*(?=\])', typeSlice, re.MULTILINE).group()
                    dict["EXT_ATTRIBUTES"][match] = {'enum':[i[1:-1] for i in enumSlice.split(', ')]}
                else:
                    if ('class="pre"' not in htmlSlice):
                        propType = re.search(retPattern, typeSlice)
                    elif ('title="' in typeSlice):
                        propType = re.search(typePattern, typeSlice)
                    else:
                        propType = re.search(prePattern, typeSlice)
                    if propType == None:
                        dict["EXT_ATTRIBUTES"][match] = '?TypeName?'
                    else:
                        dict["EXT_ATTRIBUTES"][match] = re.split(r',| ',propType.group())[0]
            elif "py method" in i:
                if "classmethod" in i:
                    match = (re.findall(prePattern, i)[1])
                    if ("pre" not in retSlice):
                        retType = re.search(retPattern, retSlice)
                    else:
                        retType = re.search(prePattern, retSlice)
                    if not retType:
                        dict["EXT_STATIC_METHODS"][match] = "None"
                    else:
                        dict["EXT_STATIC_METHODS"][match] = retType.group()
                else:
                    match = (re.findall(prePattern, i[i.find("descname"):])[0])
                    if ("pre" not in retSlice):
                        retType = re.search(retPattern, retSlice)
                    else:
                        retType = re.search(prePattern, retSlice)
                    if not retType:
                        dict["EXT_METHODS"][match] = "None"
                    else:
                        dict["EXT_METHODS"][match] = retType.group()
            elif "py function" in i:
                match = (re.findall(prePattern, i)[1])
                dict["EXT_FUNCTIONS"][match] = "None"
            elif "py data" in i:
                match = re.findall(prePattern, i)[0]
                if ('<p>enum in [' in typeSlice):
                    enumSlice = re.search(r'(?<=enum in \[).*(?=\])', typeSlice, re.MULTILINE).group()
                    dict["EXT_STATIC_ATTRIBUTES"][match] = {'enum':[i[1:-1] for i in enumSlice.split(', ')]}
                else:
                    if ('class="pre"' not in htmlSlice):
                        propType = re.search(retPattern, typeSlice)
                    elif ('title="' in typeSlice):
                        propType = re.search(typePattern, typeSlice)
                    else:
                        propType = re.search(prePattern, typeSlice)
                    if propType == None:
                        dict["EXT_STATIC_ATTRIBUTES"][match] = '?TypeName?'
                    else:
                        dict["EXT_STATIC_ATTRIBUTES"][match] = re.split(r',| ',propType.group())[0]
            elif "py class" in i:
                match = re.findall(prePattern, i)[2].split('.')[-1]
                filestem = Path(path).stem.split('.')[-1]
                if match != filestem:
                    header[filestem] = dict
                    dict[match] = copy.deepcopy(dict)
                    dict = dict[match]
                else:
                    header[match] = dict
        
        if not header:
            header[Path(path).stem.split('.')[-1]] = dict
        return header

mainJson = {
    "bpy" : {}
}
docDir = input()
pathlist = Path(docDir).glob("bpy.*.html")

for path in list(pathlist):
    header = scrapeFile(path)
    endmodule = path.stem.split('.')[-1]
    current = mainJson
    for module in path.stem.split('.'):
        if module not in current:
            current[module] = {}
        if module == endmodule:
            current[module].update(header[module])
        current = current[module]

# print(header)
with open("./test/data.json", "w+") as fp:
    json.dump(mainJson , fp, indent=4)
