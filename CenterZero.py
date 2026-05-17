import matplotlib.pyplot, numpy
fig, ax = matplotlib.pyplot.subplots()
x = numpy.linspace(-5, 5, 100)
y = x
ax.plot(x, y)
ax.spines['right'].set_color('none')
ax.spines['top'].set_color('none')
ax.spines['left'].set_position('zero')
ax.spines['bottom'].set_position('zero')
matplotlib.pyplot.show()