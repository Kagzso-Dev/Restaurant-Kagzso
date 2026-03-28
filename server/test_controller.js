const dotenv = require('dotenv');
dotenv.config();
const Order = require('./models/Order');

async function testControllerLike() {
    try {
        const filter = {};
        // Mimic Kitchen Dashboard fetch
        filter.orderStatus = { $in: ['pending', 'accepted', 'preparing', 'ready'] };
        
        const page = 1;
        const limit = 50;
        const skip = (parseInt(page) - 1) * parseInt(limit);
        
        console.log('Fetching orders...');
        const [orders, total] = await Promise.all([
            Order.find(filter, { skip, limit: parseInt(limit) }),
            Order.count(filter),
        ]);
        
        console.log('Success! Found', orders.length, 'orders. Total:', total);
        process.exit(0);
    } catch (err) {
        console.error('FAILED:', err.message);
        console.error(err.stack);
        process.exit(1);
    }
}

testControllerLike();
