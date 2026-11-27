#!/bin/sh
# Stamps style.css / app.js links in index.html with a content hash so browsers never mix a new page with old cached files.
cd "$(dirname "$0")"
c=$(md5sum style.css | cut -c1-8); j=$(md5sum app.js | cut -c1-8)
sed -i -E "s#href=\"style\.css(\?v=[0-9a-f]+)?\"#href=\"style.css?v=$c\"#; s#src=\"app\.js(\?v=[0-9a-f]+)?\"#src=\"app.js?v=$j\"#" index.html
grep -o 'style.css?v=[0-9a-f]*\|app.js?v=[0-9a-f]*' index.html
