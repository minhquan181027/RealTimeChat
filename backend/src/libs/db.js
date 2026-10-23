import mongoose from 'mongoose'

export const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_CONNECTIONSTRING);
        console.log('Kết nối database thành công')
    } catch (error) {
        console.log('Lỗi kết nối CSDL', error);
        process.exit(1);
    }
}