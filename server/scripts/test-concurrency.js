/**
 * Concurrency Test for Order Placement
 * Places multiple orders simultaneously to test the atomic counter fix.
 */
require('dotenv').config();
const axios = require('axios');

const API_URL = process.env.API_URL || 'http://localhost:5005/api';
const TOKEN = process.env.TEST_TOKEN; // Requires a valid JWT

const testConcurrency = async () => {
    if (!TOKEN) {
        console.error('Please provide a TEST_TOKEN in .env or script to run this test.');
        process.exit(1);
    }
    
    console.log('--- Starting Concurrency Test ---');
    const orderData = {
        orderType: 'takeaway',
        customerInfo: { name: 'Concurrency Test', phone: '1234567890' },
        items: [{ menuItemId: 'test_item_id', name: 'Test Item', price: 100, quantity: 1 }],
        totalAmount: 100,
        tax: 5,
        finalAmount: 105
    };
    
    const numOrders = 10;
    const promises = [];
    
    for (let i = 0; i < numOrders; i++) {
        promises.push(
            axios.post(`${API_URL}/orders`, orderData, {
                headers: { Authorization: `Bearer ${TOKEN}` }
            }).then(v => {
                console.log(`Order ${i+1} placed: ${v.data.orderNumber}`); return v.data;
            }).catch(e => {
                console.error(`Order ${i+1} failed: ${e.response?.data?.message || e.message}`);
            })
        );
    }
    
    const results = await Promise.all(promises);
    const orderNumbers = results.filter(Boolean).map(r => r.orderNumber);
    const duplicates = orderNumbers.filter((item, index) => orderNumbers.indexOf(item) !== index);
    
    console.log('Results:', orderNumbers);
    if (duplicates.length > 0) {
        console.error('FAIL: Duplicate order numbers detected:', duplicates);
    } else {
        console.log('PASS: No duplicate order numbers.');
    }
};

// testConcurrency();
console.log('Test script created. Please provide a valid login token before running.');
