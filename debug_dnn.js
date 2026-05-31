const { DNN } = require('./dnn');

const nn = new DNN([3, 16, 16, 4], 0.001, 0.5);
const input = [0.56, 0.227, 0];
const target = [1, 0, 0, 0];

console.log('Initial FeedForward:', nn.feedForward(input));
for (let i = 0; i < 2000; i++) {
  const loss = nn.train(input, target);
  if (i % 100 === 0) console.log(`Step ${i}, Loss: ${loss}`);
}
console.log('Final FeedForward:', nn.feedForward(input));
