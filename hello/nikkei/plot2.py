import random

# 半径を100とする
radius = 999100

# rの2乗を求めておく
radius2 = radius * radius

# 円の中に入った矢の本数を0にしておく
inside = 0

# 放つ矢の総数をキー入力する
total = int(input("放つ矢の総数 = "))

# 矢を放って円の中に入った本数をカウントする
for _ in range(total):
  x = random.randint(-radius, radius)
  y = random.randint(-radius, radius)
  if x * x + y * y <= radius2:
    inside += 1

# 円周率を求めて表示する
pi = (inside / total) * 4
print(f"円周率 = {pi:.2f}")