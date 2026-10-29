require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json());

const foodSchema = new mongoose.Schema({
  foodId: { type: String, required: true, unique: true, trim: true },
  name: { type: String, required: true, trim: true },
  category: { type: String, required: true, trim: true },
  cuisine: { type: String, default: '', trim: true },
  ingredients: { type: [String], default: [] },
  price: { type: Number, required: true, min: 0 },
  quantity: { type: Number, default: 0, min: 0 },
  description: { type: String, default: '' },
  imageUrl: { type: String, default: '' },
}, { versionKey: false });

const Food = mongoose.model('Food', foodSchema, 'foods');

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const findById = (id) =>
  mongoose.isValidObjectId(id)
    ? Food.findOne({ $or: [{ _id: id }, { foodId: id }] })
    : Food.findOne({ foodId: id });

function validate(body, isUpdate = false) {
  const errors = [];
  if (!isUpdate || body.foodId !== undefined) if (!body.foodId || !String(body.foodId).trim()) errors.push('foodId là bắt buộc');
  if (!isUpdate || body.name !== undefined) if (!body.name || !String(body.name).trim()) errors.push('name là bắt buộc');
  if (!isUpdate || body.category !== undefined) if (!body.category || !String(body.category).trim()) errors.push('category là bắt buộc');
  if (!isUpdate || body.price !== undefined) if (body.price === undefined || isNaN(Number(body.price)) || Number(body.price) < 0) errors.push('price phải là số >= 0');
  if (body.quantity !== undefined && (isNaN(Number(body.quantity)) || Number(body.quantity) < 0)) errors.push('quantity phải là số >= 0');
  if (body.ingredients !== undefined && !Array.isArray(body.ingredients)) errors.push('ingredients phải là mảng');
  return errors;
}

app.get('/health', (req, res) => {
  const dbOk = mongoose.connection.readyState === 1;
  res.status(dbOk ? 200 : 503).json({ status: dbOk ? 'ok' : 'db_disconnected', uptime: process.uptime() });
});

const normalize = (s) =>
  String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();

app.get('/api/foods', async (req, res) => {
  try {
    const { search } = req.query;
    let foods = await Food.find().sort({ foodId: 1 });
    if (search && search.trim()) {
      const kw = normalize(search.trim());
      foods = foods.filter((f) =>
        [f.name, f.category, f.cuisine].some((v) => normalize(v).includes(kw))
      );
    }
    res.json(foods);
  } catch (e) { res.status(500).json({ message: 'Lỗi máy chủ', error: e.message }); }
});

app.get('/api/foods/:id', async (req, res) => {
  try {
    const food = await findById(req.params.id);
    if (!food) return res.status(404).json({ message: 'Không tìm thấy món ăn' });
    res.json(food);
  } catch (e) { res.status(500).json({ message: 'Lỗi máy chủ', error: e.message }); }
});

app.post('/api/foods', async (req, res) => {
  const errors = validate(req.body);
  if (errors.length) return res.status(400).json({ message: 'Dữ liệu không hợp lệ', errors });
  try {
    if (await Food.exists({ foodId: req.body.foodId.trim() }))
      return res.status(409).json({ message: 'foodId đã tồn tại' });
    res.status(201).json(await Food.create(req.body));
  } catch (e) {
    if (e.code === 11000) return res.status(409).json({ message: 'foodId đã tồn tại' });
    res.status(500).json({ message: 'Lỗi máy chủ', error: e.message });
  }
});

app.put('/api/foods/:id', async (req, res) => {
  const errors = validate(req.body, true);
  if (errors.length) return res.status(400).json({ message: 'Dữ liệu không hợp lệ', errors });
  try {
    const food = await findById(req.params.id);
    if (!food) return res.status(404).json({ message: 'Không tìm thấy món ăn' });
    if (req.body.foodId && req.body.foodId !== food.foodId && await Food.exists({ foodId: req.body.foodId }))
      return res.status(409).json({ message: 'foodId đã tồn tại' });
    Object.assign(food, req.body);
    res.json(await food.save());
  } catch (e) { res.status(500).json({ message: 'Lỗi máy chủ', error: e.message }); }
});

app.delete('/api/foods/:id', async (req, res) => {
  try {
    const food = await findById(req.params.id);
    if (!food) return res.status(404).json({ message: 'Không tìm thấy món ăn' });
    await food.deleteOne();
    res.json({ message: 'Đã xóa món ăn' });
  } catch (e) { res.status(500).json({ message: 'Lỗi máy chủ', error: e.message }); }
});

const PORT = process.env.PORT || 5000;
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('Đã kết nối MongoDB Atlas');
    app.listen(PORT, () => console.log(`Server chạy cổng ${PORT}`));
  })
  .catch((err) => {
    console.error('Lỗi kết nối MongoDB:', err.message);
    process.exit(1);
  });