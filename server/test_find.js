const dotenv = require('dotenv');
dotenv.config();
const Order = require('./models/Order');

async function test() {
    try {
        const filter = { orderStatus: { $in: ['pending', 'accepted', 'preparing', 'ready'] } };
        const orders = await Order.find(filter, { limit: 5 });
        console.log('Order.find Success! Found', orders.length, 'orders');
        
        const count = await Order.count(filter);
        console.log('Order.count Success! Total:', count);
        process.exit(0);
    } catch (err) {
        console.error('FAILED:', err.message);
        console.error(err.stack);
        process.exit(1);
    }
}

test();
