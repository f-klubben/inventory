import json
import requests
from wand.image import Image
from wand.color import Color
from io import BytesIO


with open("images.json") as f:
    data = json.load(f)

request_headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:99.0) Gecko/20100101 Firefox/99.0"
}

for filename, url in data.items():
    resp = requests.get(url, headers=request_headers)
    with Image(file=BytesIO(resp.content)) as img:
        img.transform(resize="150x150>")
        img.background_color = Color("white")
        if img.size != (150, 150):
            y, x = img._gravity_to_offset(gravity="center", width=150, height=150)
            img.extent(width=150, height=150, x=x, y=y)
        img.format = "png"
        img.save(filename=f"img/{filename}")
    print(filename)
