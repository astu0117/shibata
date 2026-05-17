from PIL import Image
import numpy as np
import os
import sys

files = os.listdir(sys.argv[1]) 
os.chdir(sys.argv[1]) 

f = open(sys.argv[2], 'w')

for file in files:
  img = Image.open(file) 
  width, height = img.size
  img_pixels = np.array(img.convert('1'), int)  

  binarized_img = Image.fromarray(img_pixels.astype(np.uint8) * 255)
  binarized_img.save('binarized_' + file)

  img_pixels = np.concatenate(img_pixels)
  img_pixels = list(map(str, img_pixels))
  string = ''.join(img_pixels)
  f.write(string + '\n')

f.close()
