import numpy, tkinter
from matplotlib.backend_bases import key_press_handler
from matplotlib.backends.backend_tkagg import (FigureCanvasTkAgg, NavigationToolbar2Tk)
from matplotlib.figure import Figure

class MatplotlibTkinter:
  def __init__(self, root:tkinter.Tk):
    root.title(self.__class__.__name__)
    fig = Figure(figsize=(5, 5), dpi=100)
    ax = fig.add_subplot()
    x = numpy.linspace(-5, 5, 100)
    y = x
    ax.plot(x, y)
    ax.spines['right'].set_color('none')
    ax.spines['top'].set_color('none')
    ax.spines['left'].set_position('zero')
    ax.spines['bottom'].set_position('zero')
    canvas = FigureCanvasTkAgg(fig, master=root)
    canvas.mpl_connect('key_press_event', lambda event: print(f'{event.key} pressed'))
    canvas.mpl_connect('key_press_event', key_press_handler)
    toolbar = NavigationToolbar2Tk(canvas, root, pack_toolbar=False)
    toolbar.update()
    toolbar.pack(side=tkinter.BOTTOM, fill=tkinter.X)
    canvas.get_tk_widget().pack(side=tkinter.TOP, fill=tkinter.BOTH, expand=True)

root = tkinter.Tk()
MatplotlibTkinter(root)
root.mainloop()