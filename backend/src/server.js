import experss from 'express'
import dotenv from 'dotenv'
import { connectDB } from './libs/db.js';
import authRoute from './routes/authRoute.js'
dotenv.config();

const app = experss();
const PORT = process.env.PORT || 1234;

//middlewares
app.use(experss.json());

//public routes
app.use('/api/auth', authRoute);

//private routes

connectDB().then(() => {
    app.listen(PORT, () => {
        console.log(`Server  bắt đầu trên cổng ${PORT}`);
    });
});


