// src/routes/adminRoutes.js
const express = require('express');
const router = express.Router();
const promisePool = require('../config/database');
const multer = require('multer');
const path = require('path');

// Define storage for the images
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, './public/images'); // Assuming you have a 'public/images' folder to store images
    },
    filename: (req, file, cb) => {
        cb(null, 'product-' + Date.now() + path.extname(file.originalname));
    },
});

// Check file type
function checkFileType(file, cb) {
    const filetypes = /jpeg|jpg|png/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    if (extname && mimetype) {
        return cb(null, true);
    } else {
        cb('Error: Images Only!');
    }
}

// Initialize upload
const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        checkFileType(file, cb);
    },
});

// Admin-related routes
router.post('/products', upload.single('image'), (req, res) => {
    const { name, description, price } = req.body;
    const imageUrl = req.file ? `http://design-fabric-backend-dc5b3efbeec2.herokuapp.com/images/${req.file.filename}` : null; // Save the image URL

    // Assuming you have validation for name, description, price, and imageUrl

    promisePool.execute('INSERT INTO Product (Name, Description, Price, ImageUrl) VALUES (?, ?, ?, ?)', [name, description, price, imageUrl], (err, results) => {
        if (err) {
            console.error('Error executing MySQL query:', err);
            res.status(500).send('Internal Server Error');
        } else {
            res.status(201).json({ message: 'Product added successfully', productId: results.insertId });
        }
    });
});

router.put('/products/:productId', upload.single('image'), (req, res) => {
    const productId = req.params.productId;
    const { name, description, price } = req.body;
    const imageUrl = req.file ? `/images/${req.file.filename}` : null; // Save the new image URL

    // Assuming you have validation for name, description, price, and imageUrl

    promisePool.execute('UPDATE Product SET Name = ?, Description = ?, Price = ?, ImageUrl = ? WHERE ProductID = ?', [name, description, price, imageUrl, productId], (err, results) => {
        if (err) {
            console.error('Error executing MySQL query:', err);
            res.status(500).send('Internal Server Error');
        } else {
            if (results.affectedRows === 0) {
                res.status(404).json({ message: 'Product not found' });
            } else {
                res.json({ message: 'Product updated successfully' });
            }
        }
    });
});


router.delete('/products/:productId', async (req, res) => {
    const productId = req.params.productId;

    try {
        // Delete associated order items first
        await promisePool.execute('DELETE FROM ProductOrder WHERE ProductID = ?', [productId]);

        // Delete associated product
        const result = await promisePool.execute('DELETE FROM Product WHERE ProductID = ?', [productId]);

        if (result[0].affectedRows === 0) {
            res.status(404).json({ message: 'Product not found' });
        } else {
            res.json({ message: 'Product deleted successfully' });
        }
    } catch (err) {
        console.error('Error deleting product:', err);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// Admin-only routes(Authorization and authentication required)
// router.get('/orders', (req, res) => {
//     db.query('SELECT * FROM `Order`', (err, results) => {
//         if (err) {
//             console.error('Error executing MySQL query:', err);
//             res.status(500).send('Internal Server Error');
//         } else {
//             res.json(results);
//         }
//     });
// });

// get All orders(Authorization and authentication required)
// router.get('/orders', (req, res) => {
//     // Retrieve all orders from the database (admin only)
//     db.query('SELECT * FROM `Order`', (err, results) => {
//         if (err) {
//             console.error('Error executing MySQL query:', err);
//             res.status(500).send('Internal Server Error');
//         } else {
//             res.json(results);
//         }
//     });
// });

// GET endpoint to retrieve orders with product information
// GET endpoint to retrieve orders with product information
router.get('/orders', async (req, res) => {
    try {
        const selectQuery = `
            SELECT po.OrderId, po.ProductId, po.CustomerName, po.CustomerEmail, po.CustomerPhoneNumber, po.CustomerAddress,
                p.Name as ProductName
            FROM ProductOrder po
            LEFT JOIN Product p ON po.ProductId = p.ProductID
        `;

        const [results] = await promisePool.execute(selectQuery);

        // Map the results to include only necessary fields
        const orders = results.map((result) => ({
            OrderId: result.OrderId,
            ProductId: result.ProductId,
            CustomerName: result.CustomerName,
            CustomerEmail: result.CustomerEmail,
            CustomerPhoneNumber: result.CustomerPhoneNumber,
            CustomerAddress: result.CustomerAddress,
            ProductName: result.ProductName,
        }));

        res.status(200).json(orders);
    } catch (err) {
        console.error('Error retrieving orders: ', err);
        res.status(500).send('Error retrieving orders');
    }
});


// Assuming you have a table named 'OrderItem' for storing order items
router.delete('/orders/:orderId', (req, res) => {
    const orderId = req.params.orderId;

    // Delete the order
    promisePool.execute('DELETE FROM ProductOrder WHERE OrderId = ?', [orderId], (err, results) => {
        if (err) {
            console.error('Error executing MySQL query:', err);
            res.status(500).send('Internal Server Error');
        } else {
            if (results.affectedRows === 0) {
                res.status(404).json({ message: 'Order not found' });
            } else {
                res.json({ message: 'Order deleted successfully' });
            }
        }
    });

});


module.exports = router;
