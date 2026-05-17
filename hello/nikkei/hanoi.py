# hanoi関数の定義
def hanoi(n, a, b, c):
  if n > 0:
    hanoi(n - 1, a, c, b)
    print(f"{a}から{c}へ")
    hanoi(n - 1, b, a, c)

# hanoi関数を使うプログラム
n = int(input("円盤の枚数-->"))
hanoi(n, "棒A", "棒B", "棒C")