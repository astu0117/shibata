const axios = require('axios');

async function testPredict() {
  try {
    const response = await axios.post('http://localhost:3000/api/predict', {
      numbers: [560, 2278648, 0]
    });
    console.log('Prediction Result:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('Error during prediction test:', error.message);
  }
}

testPredict();
