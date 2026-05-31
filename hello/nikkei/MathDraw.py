import configparser, matplotlib.pyplot, numpy, os, sys, tkinter, webbrowser
from matplotlib.backend_bases import key_press_handler
from matplotlib.backends.backend_tkagg import FigureCanvasTkAgg, NavigationToolbar2Tk
from matplotlib.figure import Figure
from tkinter import messagebox, ttk
LINES = 5
LINE_MODE = ('なし', 'y=ax+b', 'x=a', 'y=a', 'xy=a', 'y=axx+b', 'a->b')
P = 3

class MathDraw:
  def __init__(self, root:tkinter.Tk):
    root.title(self.__class__.__name__)
    self.iniFilename = os.path.abspath(__file__).replace('.py', '.ini')
    clientX = '200'
    clientY = '200'
    clientHeight = '650'
    clientWidth = '550'
    cp = configparser.ConfigParser()
    try:
      cp.read(self.iniFilename)
      clientX = cp['Client']['X']
      clientY = cp['Client']['Y']
      clientHeight = cp['Client']['Height']
      clientWidth = cp['Client']['Width']
    except:
      print(self.__class__.__name__ + ': Use default value(s)', file=sys.stderr)
    root.geometry(clientWidth + 'x' + clientHeight + '+' + clientX + '+' + clientY)
    root.option_add('*tearOff', tkinter.FALSE)
    menu = tkinter.Menu()
    menuFile = tkinter.Menu()
    menu.add_cascade(menu=menuFile, label='ファイル(F)', underline=5)
    menuFile.add_command(label='終了(X)', underline=3, command=self.menuFileExit,                 
      accelerator='Alt+F4')
    menuHelp = tkinter.Menu()
    menu.add_cascade(menu=menuHelp, label='ヘルプ(H)', underline=4)
    menuHelp.add_command(label='ヘルプファイルを開く(O)', underline=10,
      command=self.menuHelpOpenWeb)
    menuHelp.add_separator()
    menuHelp.add_command(label='バージョン情報(V)', underline=8,
      command=self.menuHelpVersion)
    root['menu'] = menu
    #root.bind_all('<Alt-F4>', self.menuFileExit)
    root.protocol('WM_DELETE_WINDOW', self.menuFileExit)

    frameTop = tkinter.Frame(root, padx=P, pady=P)
    self.comboBoxMode = list[ttk.Combobox]()
    labelA = list[tkinter.Label]()
    self.entryA = list[tkinter.Entry]()
    labelB = list[tkinter.Label]()
    self.entryB = list[tkinter.Entry]()
    self.checkButtonFormula = list[tkinter.Checkbutton]()
    self.showFormula = list[tkinter.BooleanVar]()
    for i in range(LINES):
      self.comboBoxMode.append(ttk.Combobox(frameTop, state='readonly',
        values=LINE_MODE))
      self.comboBoxMode[i].grid(row=i, padx=P, pady=P)
      labelA.append(tkinter.Label(frameTop, text='a ='))
      labelA[i].grid(row=i, column=1, padx=P, pady=P)
      self.entryA.append(tkinter.Entry(frameTop))
      self.entryA[i].grid(row=i, column=2, padx=P, pady=P)
      labelB.append(tkinter.Label(frameTop, text='b ='))
      labelB[i].grid(row=i, column=3, padx=P, pady=P)
      self.entryB.append(tkinter.Entry(frameTop))
      self.entryB[i].grid(row=i, column=4, padx=P, pady=P)
      self.showFormula.append(tkinter.BooleanVar())
      self.checkButtonFormula.append(tkinter.Checkbutton(frameTop, text='数式',
        variable=self.showFormula[i]))
      self.checkButtonFormula[i].grid(row=i, column=5, padx=P, pady=P)
    labelPoint = tkinter.Label(frameTop, text='点の描画')
    labelPoint.grid(row=i+1, column=0, sticky=tkinter.E, padx=P, pady=P)
    self.entryPoint = tkinter.Entry(frameTop)
    self.entryPoint.grid(row=i+1, column=1, columnspan=4,
      sticky=tkinter.EW, padx=P, pady=P)
    self.showCordinates = tkinter.BooleanVar()
    self.checkButtonShowCordinates = tkinter.Checkbutton(frameTop, text='座標',
      variable=self.showCordinates)
    self.checkButtonShowCordinates.grid(row=i+1, column=5, padx=P, pady=P)
    labelX = tkinter.Label(frameTop, text='Xの範囲')
    labelX.grid(row=i+2, column=0, padx=P, pady=P, sticky=tkinter.E)
    labelXMin = tkinter.Label(frameTop, text='最小')
    labelXMin.grid(row=i+2, column=1, padx=P, pady=P)
    self.entryXMin = tkinter.Entry(frameTop)
    self.entryXMin.grid(row=i+2, column=2, padx=P, pady=P)
    labelXMax = tkinter.Label(frameTop, text='最大')
    labelXMax.grid(row=i+2, column=3, padx=P, pady=P)
    self.entryXMax = tkinter.Entry(frameTop)
    self.entryXMax.grid(row=i+2, column=4, padx=P, pady=P)
    labelY = tkinter.Label(frameTop, text='Yの範囲')
    labelY.grid(row=i+3, column=0, padx=P, pady=P, sticky=tkinter.E)
    labelYMin = tkinter.Label(frameTop, text='最小')
    labelYMin.grid(row=i+3, column=1, padx=P, pady=P)
    self.entryYMin = tkinter.Entry(frameTop)
    self.entryYMin.grid(row=i+3, column=2, padx=P, pady=P)
    labelYMax = tkinter.Label(frameTop, text='最大')
    labelYMax.grid(row=i+3, column=3, padx=P, pady=P)
    self.entryYMax = tkinter.Entry(frameTop)
    self.entryYMax.grid(row=i+3, column=4, padx=P, pady=P)
    self.blackOnly = tkinter.BooleanVar()
    self.checkButtonBlackOnly = tkinter.Checkbutton(
      frameTop, text='黒のみ', variable=self.blackOnly)
    self.checkButtonBlackOnly.grid(row=i+4, column=0, sticky=tkinter.W, padx=P, pady=P)
    self.showGrid = tkinter.BooleanVar()
    self.checkButtonShowGrid = tkinter.Checkbutton(
      frameTop, text='格子を表示', variable=self.showGrid)
    self.checkButtonShowGrid.grid(row=i+4, column=0, sticky=tkinter.E,
      columnspan=2, padx=P, pady=P)
    self.showTick = tkinter.BooleanVar()
    self.checkButtonShowTick = tkinter.Checkbutton(
      frameTop, text='目盛りを表示', variable=self.showTick)
    self.checkButtonShowTick.grid(row=i+4, column=2, padx=P, pady=P)
    buttonDraw = tkinter.Button(frameTop, text='描画', command=self.draw)
    buttonDraw.grid(row=i+4, column=3, columnspan=2, sticky=tkinter.EW, padx=P, pady=P)
    buttonInitialize = tkinter.Button(
      frameTop, text='初期化', command=self.initialize)
    buttonInitialize.grid(row=i+4, column=5, sticky=tkinter.EW, padx=P, pady=P)

    self.initialize()
    self.fig = Figure(figsize=(5, 5), dpi=100)
    self.fig.subplots_adjust(left=0.01, right=0.96, bottom=0.01, top=0.96)
    self.canvas = FigureCanvasTkAgg(self.fig, master=root)
    self.canvas.mpl_connect('key_press_event', lambda event: print(f'{event.key} pressed'))
    self.canvas.mpl_connect('key_press_event', key_press_handler)
    toolbar = NavigationToolbar2Tk(self.canvas, root, pack_toolbar=False)
    toolbar.update()
    frameTop.pack(side=tkinter.TOP, fill=tkinter.X)
    toolbar.pack(side=tkinter.BOTTOM, fill=tkinter.X)
    self.canvas.get_tk_widget().pack(side=tkinter.TOP, fill=tkinter.BOTH, expand=True)
    self.draw()

  def draw(self, event=None):
    self.canvas.figure.clear()
    if self.blackOnly.get():
      matplotlib.pyplot.rcParams['axes.prop_cycle'] = matplotlib.pyplot.cycler(
        'color', ['black'])
    else:
      matplotlib.pyplot.rcParams['axes.prop_cycle'] = matplotlib.pyplot.cycler(
        'color', matplotlib.pyplot.get_cmap('tab10').colors)
    try:
      xMin = float(self.entryXMin.get())
      if xMin > 0:
        xMin = 0
        self.entryXMin.delete(0, tkinter.END)
        self.entryXMin.insert(0, '0')
      xMax = float(self.entryXMax.get())
      if xMax < 0:
        xMax = 0
        self.entryXMax.delete(0, tkinter.END)
        self.entryXMax.insert(0, '0')
      yMin = float(self.entryYMin.get())
      if yMin > 0:
        yMin = 0
        self.entryYMin.delete(0, tkinter.END)
        self.entryYMin.insert(0, '0')
      yMax = float(self.entryYMax.get())
      if yMax < 0:
        yMax = 0
        self.entryYMax.delete(0, tkinter.END)
        self.entryYMax.insert(0, '0')

      ax = self.fig.add_subplot()
      ax.set_aspect('equal')
      ax.set_xlim(xMin, xMax)
      ax.set_ylim(yMin, yMax)
      ax.spines['right'].set_color('none')
      ax.spines['top'].set_color('none')
      ax.spines['left'].set_position('zero')
      ax.spines['bottom'].set_position('zero')
      if self.showGrid.get():
        ax.grid()
      if not self.showTick.get():
        ax.set_xticks([])
        ax.set_yticks([])
        ax.text(xMax/50, yMin/30-0.1, '0')
      ax.text(xMax+0.1, -0.1, 'X')
      ax.text(-0.07, yMax+0.1, 'Y')

      for i in range(LINES):
        a = eval(self.entryA[i].get())
        b = eval(self.entryB[i].get())
        match self.comboBoxMode[i].current():
          case 1:
            if a == 0:
              messagebox.showerror('エラー', 'aをゼロ以外にしてください')
              return
            x = numpy.linspace(xMin, xMax, 100)
            y = a * x + b
            ax.plot(x, y)
            if self.showFormula[i].get():
              ax.text((yMax-3-b)/a, yMax-3,
                'y=' + self.aToStr(a) + 'x' + self.bToStr(b))
          case 2:
            ax.plot([a, a], [yMin, yMax])
            if self.showFormula[i].get():
              ax.text(a, yMax-3, 'x=' + str(a))
          case 3:
            ax.plot([xMin, xMax], [a, a])
            if self.showFormula[i].get():
              ax.text(xMax-3, a, 'y=' + str(a))
          case 4:
            x = numpy.linspace(xMin, 0, 1000)
            y = a / x
            ax.plot(x, y, color='black')
            x = numpy.linspace(0, xMax, 1000)
            y = a / x
            ax.plot(x, y, color='black')
            if self.showFormula[i].get():
              if xMax > 2:
                ax.text(xMax-2, a/(xMax-2), 'xy=' + str(a))
              if xMin < -2:
                ax.text(xMin+2, a/(xMin+2), 'xy=' + str(a))
          case 5:
            x = numpy.linspace(xMin, xMax, 1000)
            y = a * x * x + b
            ax.plot(x, y)
            if self.showFormula[i].get():
              ax.text(0, b, 'y=' + self.aToStr(a) + 'xx' + self.bToStr(b))
          case 6:
            ax.plot([a[0], b[0]], [a[1], b[1]])
            if self.showFormula[i].get():
              ax.text(a[0], a[1], a)
              ax.text(b[0], b[1], b)

      point = self.entryPoint.get().split(',')
      pointLength = len(point)
      if pointLength % 2 == 1:
        pointLength -= 1
      for i in range(0, pointLength, 2):
        x = eval(point[i])
        y = eval(point[i+1])
        ax.plot(x, y, marker='.', markersize=10)
        if self.showCordinates.get():
          ax.text(x, y, '(' + point[i] + ',' + point[i+1] + ')')
    except Exception as e:
      messagebox.showerror('エラー', '値が不適切です\n' + str(e))
      return
    self.canvas.draw()

  def initialize(self, event=None):
    for i in range(LINES):
      self.comboBoxMode[i].current(0)
      self.entryA[i].delete(0, tkinter.END)
      self.entryA[i].insert(0, '10')
      self.entryB[i].delete(0, tkinter.END)
      self.entryB[i].insert(0, '0')
      self.showFormula[i].set(True)
    self.comboBoxMode[0].current(1)
    self.entryPoint.delete(0, tkinter.END)
    self.showCordinates.set(True)
    self.entryXMin.delete(0, tkinter.END)
    self.entryXMin.insert(0, '-9999999999999999')
    self.entryXMax.delete(0, tkinter.END)
    self.entryXMax.insert(0, '999999999999999999999999999999999999999999')
    self.entryYMin.delete(0, tkinter.END)
    self.entryYMin.insert(0, '-9999999999999999')
    self.entryYMax.delete(0, tkinter.END)
    self.entryYMax.insert(0, '999999999999999999999999999999999999999999')
    self.blackOnly.set(False)
    self.showGrid.set(False)
    self.showTick.set(True)

  def aToStr(self, a)->str:
    match a:
      case 1:
        return ''
      case -1:
        return '-'
      case _:
        return str(a)

  def bToStr(self, b)->str:
    result:str = ''
    if b > 0:
      result = '+' + str(b)
    elif b < 0:
      result = str(b)
    return result

  def menuFileExit(self, event=None):
    cp = configparser.ConfigParser()
    cp['Client'] = {
      'X': str(root.winfo_x()),
      'Y': str(root.winfo_y()),
      'Height': str(root.winfo_height()),
      'Width': str(root.winfo_width())
    }

    with open(self.iniFilename, 'w') as f:
      cp.write(f)
    root.destroy()

  def menuHelpOpenWeb(self):
    helpFilePath = os.path.dirname(__file__) + os.sep + 'help.htm'
    if os.path.isfile(helpFilePath):
      helpFilePath = 'file:///' + helpFilePath.replace(os.sep, '/')
      webbrowser.open(helpFilePath)
    else:
      messagebox.showerror(self.__class__.__name__,
        helpFilePath + 'がありません')

  def menuHelpVersion(self):
    s = self.__class__.__name__ + ' Version 0.01(2024/10/03)\n'
    s += '©2024 Hideo Harada\n'
    s += 'with Python ' + sys.version
    messagebox.showinfo(self.__class__.__name__, s)

root = tkinter.Tk()
MathDraw(root)
root.mainloop()