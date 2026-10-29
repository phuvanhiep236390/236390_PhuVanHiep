import { useEffect, useState, useCallback } from 'react'
import './App.css'

const API = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '')

const emptyForm = {
  foodId: '', name: '', category: '', cuisine: '',
  ingredients: '', price: '', quantity: '', description: '', imageUrl: '',
}

const getId = (f) => f._id ?? f.foodId
const extractList = (d) => (Array.isArray(d) ? d : d?.data ?? d?.foods ?? [])
const extractItem = (d) => (d && !Array.isArray(d) && (d.data ?? d.food)) || d
const money = (n) => Number(n || 0).toLocaleString('vi-VN') + ' đ'

async function request(path, options = {}) {
  const res = await fetch(API + path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  let body = null
  try { body = await res.json() } catch { /* không có body */ }
  if (!res.ok) throw new Error(body?.message || body?.error || `Lỗi ${res.status}`)
  return body
}

export default function App() {
  const [foods, setFoods] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [search, setSearch] = useState('')
  const [view, setView] = useState('list') // list | detail | form
  const [selected, setSelected] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)

  const loadFoods = useCallback(async (keyword) => {
    setLoading(true)
    setError('')
    try {
      const q = keyword ? `?search=${encodeURIComponent(keyword)}` : ''
      const data = await request('/api/foods' + q)
      setFoods(extractList(data))
    } catch (e) {
      setError('Không tải được danh sách món ăn: ' + e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  // Tìm kiếm theo từ khóa (đợi 300ms sau khi ngừng gõ)
  useEffect(() => {
    const t = setTimeout(() => loadFoods(search.trim()), 300)
    return () => clearTimeout(t)
  }, [search, loadFoods])

  // Tự ẩn thông báo thành công
  useEffect(() => {
    if (!notice) return
    const t = setTimeout(() => setNotice(''), 3500)
    return () => clearTimeout(t)
  }, [notice])

  const openDetail = async (food) => {
    setView('detail')
    setSelected(food)
    setLoading(true)
    setError('')
    try {
      const data = await request(`/api/foods/${getId(food)}`)
      setSelected(extractItem(data))
    } catch (e) {
      setError('Không tải được chi tiết món ăn: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  const openAdd = () => {
    setForm(emptyForm)
    setEditing(false)
    setError('')
    setView('form')
  }

  const openEdit = (food) => {
    setForm({
      foodId: food.foodId ?? '',
      name: food.name ?? '',
      category: food.category ?? '',
      cuisine: food.cuisine ?? '',
      ingredients: Array.isArray(food.ingredients) ? food.ingredients.join(', ') : food.ingredients ?? '',
      price: food.price ?? '',
      quantity: food.quantity ?? '',
      description: food.description ?? '',
      imageUrl: food.imageUrl ?? '',
    })
    setSelected(food)
    setEditing(true)
    setError('')
    setView('form')
  }

  const backToList = () => {
    setView('list')
    setError('')
  }

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!form.foodId.trim() || !form.name.trim() || !form.category.trim()) {
      setError('Vui lòng nhập Mã món, Tên món và Loại món ăn.')
      return
    }
    if (form.price === '' || Number(form.price) < 0) {
      setError('Giá phải là số không âm.')
      return
    }
    if (form.quantity !== '' && Number(form.quantity) < 0) {
      setError('Số lượng phải là số không âm.')
      return
    }
    const payload = {
      foodId: form.foodId.trim(),
      name: form.name.trim(),
      category: form.category.trim(),
      cuisine: form.cuisine.trim(),
      ingredients: form.ingredients.split(',').map((s) => s.trim()).filter(Boolean),
      price: Number(form.price),
      quantity: form.quantity === '' ? 0 : Number(form.quantity),
      description: form.description.trim(),
      imageUrl: form.imageUrl.trim(),
    }
    setSaving(true)
    try {
      if (editing) {
        await request(`/api/foods/${getId(selected)}`, { method: 'PUT', body: JSON.stringify(payload) })
        setNotice('Cập nhật món ăn thành công!')
      } else {
        await request('/api/foods', { method: 'POST', body: JSON.stringify(payload) })
        setNotice('Thêm món ăn thành công!')
      }
      setView('list')
      await loadFoods(search.trim())
    } catch (e) {
      setError('Lưu thất bại: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  const onDelete = async (food) => {
    if (!window.confirm(`Bạn có chắc muốn xóa món "${food.name}"?`)) return
    setError('')
    try {
      await request(`/api/foods/${getId(food)}`, { method: 'DELETE' })
      setNotice('Đã xóa món ăn.')
      setView('list')
      await loadFoods(search.trim())
    } catch (e) {
      setError('Xóa thất bại: ' + e.message)
    }
  }

  return (
    <div className="container">
      <header>
        <h1>🍜 Quản lý món ăn</h1>
        {view === 'list' && <button className="btn primary" onClick={openAdd}>+ Thêm món ăn</button>}
        {view !== 'list' && <button className="btn" onClick={backToList}>← Quay lại danh sách</button>}
      </header>

      {notice && <div className="alert success">{notice}</div>}
      {error && <div className="alert error">{error}</div>}

      {view === 'list' && (
        <>
          <input
            className="search"
            type="text"
            placeholder="Tìm theo tên, loại món ăn, vùng miền..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {loading && <p className="muted">Đang tải dữ liệu...</p>}
          {!loading && !error && foods.length === 0 && <p className="muted">Không có món ăn nào.</p>}
          {foods.length > 0 && (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Mã</th><th>Tên món</th><th>Loại</th><th>Vùng miền</th>
                    <th>Giá</th><th>SL</th><th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {foods.map((f) => (
                    <tr key={getId(f)}>
                      <td>{f.foodId}</td>
                      <td>{f.name}</td>
                      <td>{f.category}</td>
                      <td>{f.cuisine}</td>
                      <td>{money(f.price)}</td>
                      <td>{f.quantity}</td>
                      <td className="actions">
                        <button className="btn small" onClick={() => openDetail(f)}>Xem</button>
                        <button className="btn small" onClick={() => openEdit(f)}>Sửa</button>
                        <button className="btn small danger" onClick={() => onDelete(f)}>Xóa</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {view === 'detail' && selected && (
        <div className="card">
          {loading && <p className="muted">Đang tải chi tiết...</p>}
          {selected.imageUrl && <img className="food-img" src={selected.imageUrl} alt={selected.name} />}
          <h2>{selected.name}</h2>
          <p><b>Mã món:</b> {selected.foodId}</p>
          <p><b>Loại:</b> {selected.category}</p>
          <p><b>Vùng miền:</b> {selected.cuisine}</p>
          <p><b>Nguyên liệu:</b> {Array.isArray(selected.ingredients) ? selected.ingredients.join(', ') : selected.ingredients}</p>
          <p><b>Giá:</b> {money(selected.price)}</p>
          <p><b>Số lượng:</b> {selected.quantity}</p>
          <p><b>Mô tả:</b> {selected.description}</p>
          <div className="actions">
            <button className="btn" onClick={() => openEdit(selected)}>Sửa</button>
            <button className="btn danger" onClick={() => onDelete(selected)}>Xóa</button>
          </div>
        </div>
      )}

      {view === 'form' && (
        <form className="card" onSubmit={onSubmit}>
          <h2>{editing ? 'Cập nhật món ăn' : 'Thêm món ăn mới'}</h2>
          <label>Mã món (foodId) *
            <input name="foodId" value={form.foodId} onChange={onChange} disabled={editing} />
          </label>
          <label>Tên món *
            <input name="name" value={form.name} onChange={onChange} />
          </label>
          <label>Loại món ăn *
            <input name="category" value={form.category} onChange={onChange} />
          </label>
          <label>Ẩm thực / Vùng miền
            <input name="cuisine" value={form.cuisine} onChange={onChange} />
          </label>
          <label>Nguyên liệu (cách nhau bằng dấu phẩy)
            <input name="ingredients" value={form.ingredients} onChange={onChange} />
          </label>
          <div className="row">
            <label>Giá (VNĐ) *
              <input name="price" type="number" min="0" value={form.price} onChange={onChange} />
            </label>
            <label>Số lượng
              <input name="quantity" type="number" min="0" value={form.quantity} onChange={onChange} />
            </label>
          </div>
          <label>Mô tả
            <textarea name="description" rows="3" value={form.description} onChange={onChange} />
          </label>
          <label>Đường dẫn hình ảnh
            <input name="imageUrl" value={form.imageUrl} onChange={onChange} />
          </label>
          <div className="actions">
            <button className="btn primary" type="submit" disabled={saving}>
              {saving ? 'Đang lưu...' : editing ? 'Lưu thay đổi' : 'Thêm món'}
            </button>
            <button className="btn" type="button" onClick={backToList}>Hủy</button>
          </div>
        </form>
      )}
    </div>
  )
}