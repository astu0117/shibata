const { DNN } = require('./dnn');

const nn = new DNN([3, 16, 16, 4], 0.01, 0.9);
const rawData = [
  { name: "mizuho", nums: [560, 2278648, 0] },
  { name: "saitamarisona", nums: [793, 0, 4366399] },
  { name: "mitsuisumitomo", nums: [200, 4902647, 0] },
  { name: "sonybank", nums: [1, 6774308, 0] },
];
const bankNames = ["mizuho", "saitamarisona", "mitsuisumitomo", "sonybank"];

const normalize = (nums) => [
  nums[0] / 1000.0,
  nums[1] / 10000000.0,
  nums[2] / 10000000.0
];

for (let i = 0; i < 100; i++) {
  let epochLoss = 0;
  rawData.forEach(data => {
    const target = new Array(4).fill(0);
    target[bankNames.indexOf(data.name)] = 1.0;
    epochLoss += nn.train(normalize(data.nums), target);
  });
  if (i % 10 === 0) console.log(`Step ${i}, Loss: ${epochLoss/4}`);
  if (isNaN(epochLoss)) {
    console.log('NaN detected at step', i);
    process.exit(1);
  }
}
console.log('Success!');
