from PIL import Image
import numpy as np
import os
import sys

f = open("result_data.txt", "r")
index = 1
dir_name = "result"

os.makedirs(dir_name, exist_ok=True)

for line in f:
  img_pixels = list(map(int, list(line.strip())))
  img_pixels = np.array(img_pixels).reshape(128, 128)

  binarized_img = Image.fromarray(img_pixels.astype(np.uint8) * 255)
  binarized_img.save(dir_name + "/result" + str(index) + ".png")
  index += 1

f.close()
