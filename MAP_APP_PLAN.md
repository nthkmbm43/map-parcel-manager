# DEV TEST V1-2026 — Map Web Application

## 🎯 เป้าหมาย
สร้าง Web Application จัดการแปลงที่ดินบนแผนที่ — วาดพื้นที่, คำนวณพื้นที่, เก็บรูปภาพ, แสดงรายละเอียดแปลง

---

## 📋 Requirements (จากโจทย์)

| # | ความต้องการ | รายละเอียด |
|---|-------------|------------|
| 1 | สร้างแปลง | วาด polygon อย่างน้อย 4 จุดบนแผนที่ |
| 2 | คำนวณพื้นที่ | คำนวณจากพิกัดที่วาด (ตร.ม. / ไร่) |
| 3 | เก็บภาพพื้นที่ | screenshot หรือ map snapshot ของแปลง |
| 4 | ใส่รายละเอียดแปลง | ชื่อ, คำอธิบาย, ข้อมูลอื่นๆ |
| 5 | สร้างแปลงเพิ่ม | รองรับอย่างน้อย 3 แปลง (รวมข้อ 1 = 4 แปลง) |
| 6 | แสดงผลแปลงทั้งหมด | list/table รายการแปลงทั้งหมด |
| 7 | ฟีเจอร์เพิ่มเติม | ตามไอเดียผู้พัฒนา |
| 8 | ภาษาใดก็ได้ | แนะนำ: HTML/CSS/JS (ไม่ต้องมี backend) |
| 9 | GitHub | push code + invite `supawat@erawangroup.com` |

---

## 🛠️ Tech Stack (แนะนำ — ทำได้เร็วสุด)

```
Frontend only (ไม่ต้อง backend/server)
- HTML + CSS + Vanilla JavaScript
- Leaflet.js         → แผนที่ (OpenStreetMap, ฟรี ไม่ต้อง API key)
- Leaflet.draw       → วาด polygon บนแผนที่
- Turf.js            → คำนวณพื้นที่จาก GeoJSON
- html2canvas        → screenshot แปลงบนแผนที่
- localStorage       → เก็บข้อมูลแปลงในเบราว์เซอร์
```

---

## 📁 โครงสร้างไฟล์

```
map-app/
├── index.html          ← หน้าหลัก (ไฟล์เดียวก็พอ)
├── style.css           ← styling
├── app.js              ← logic ทั้งหมด
└── README.md
```

> **ทางลัด:** เขียน all-in-one ใน `index.html` ไฟล์เดียว เร็วกว่า

---

## 🗺️ หน้าจอหลัก (Layout)

```
┌─────────────────────────────────────────────┐
│  🗺️ Map Parcel Manager              [+ เพิ่มแปลง] │
├───────────────────────┬─────────────────────┤
│                       │  📋 รายการแปลง      │
│    Leaflet Map        │  ┌──────────────┐   │
│                       │  │ แปลง A  5 ไร่│   │
│  [วาด polygon ที่นี่]  │  │ แปลง B  3 ไร่│   │
│                       │  │ แปลง C  7 ไร่│   │
│                       │  └──────────────┘   │
└───────────────────────┴─────────────────────┘
│  Modal: กรอกชื่อแปลง / รายละเอียด / ดูรูป  │
└─────────────────────────────────────────────┘
```

---

## ⚙️ Flow การทำงาน

```
1. โหลดหน้า → แสดงแผนที่ Leaflet (OpenStreetMap)
2. ผู้ใช้คลิก [วาดแปลง] → เปิด Leaflet.draw (polygon mode)
3. วาดครบ → Turf.js คำนวณพื้นที่ (ตร.ม. → ไร่/งาน/วา)
4. แสดง Modal → กรอก: ชื่อแปลง, เจ้าของ, หมายเหตุ
5. กด [บันทึก] → html2canvas ถ่าย snapshot แผนที่
6. บันทึกลง localStorage (GeoJSON + metadata + image base64)
7. แสดงแปลงใน sidebar list + แผนที่
```

---

## 🏗️ ขั้นตอนสร้าง (Step-by-step)

### Step 1 — โครงสร้าง HTML + Leaflet (15 นาที)
```html
<!-- index.html -->
<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <title>Map Parcel Manager</title>
  <link rel="stylesheet" href="https://unpkg.com/leaflet/dist/leaflet.css"/>
  <link rel="stylesheet" href="https://unpkg.com/leaflet-draw/dist/leaflet.draw.css"/>
</head>
<body>
  <div id="map"></div>
  <div id="sidebar"><!-- รายการแปลง --></div>

  <script src="https://unpkg.com/leaflet/dist/leaflet.js"></script>
  <script src="https://unpkg.com/leaflet-draw/dist/leaflet.draw.js"></script>
  <script src="https://unpkg.com/@turf/turf/turf.min.js"></script>
  <script src="https://html2canvas.hertzen.com/dist/html2canvas.min.js"></script>
  <script src="app.js"></script>
</body>
</html>
```

### Step 2 — Init Map + Draw Control (10 นาที)
```javascript
// app.js
const map = L.map('map').setView([13.7563, 100.5018], 13); // กรุงเทพ

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

const drawnItems = new L.FeatureGroup().addTo(map);
const drawControl = new L.Control.Draw({
  draw: { polygon: true, rectangle: false, circle: false, marker: false, polyline: false },
  edit: { featureGroup: drawnItems }
}).addTo(map);
```

### Step 3 — จับ Event วาดเสร็จ + คำนวณพื้นที่ (10 นาที)
```javascript
map.on(L.Draw.Event.CREATED, function(e) {
  const layer = e.layer;
  const geojson = layer.toGeoJSON();
  
  // คำนวณพื้นที่ด้วย Turf.js
  const areaSqM = turf.area(geojson);
  const areaRai = areaSqM / 1600; // 1 ไร่ = 1600 ตร.ม.
  
  openModal(layer, geojson, areaSqM, areaRai);
});
```

### Step 4 — Modal กรอกข้อมูล + Screenshot (15 นาที)
```javascript
function openModal(layer, geojson, areaSqM, areaRai) {
  // แสดง modal form
  // กด save → html2canvas('#map') → base64 image
  // บันทึกลง localStorage
}
```

### Step 5 — แสดงรายการแปลงใน Sidebar (10 นาที)
```javascript
function renderParcelList() {
  const parcels = JSON.parse(localStorage.getItem('parcels') || '[]');
  // วน render การ์ดแต่ละแปลง
  // คลิกการ์ด → zoom to แปลงบนแผนที่
}
```

### Step 6 — ฟีเจอร์เพิ่มเติม (ตามเวลาที่เหลือ)
- ✅ ลบแปลง / แก้ไขข้อมูล
- ✅ Export ข้อมูลเป็น GeoJSON หรือ CSV
- ✅ แสดงพื้นที่รวมทั้งหมด
- ✅ ค้นหา/กรองแปลง
- ✅ Color-code แปลงตาม category

---

## 📐 สูตรคำนวณพื้นที่ (ไทย)

```
1 ไร่    = 1,600 ตร.ม.
1 งาน   = 400 ตร.ม.  (= 1/4 ไร่)
1 ตร.วา = 4 ตร.ม.

ตัวอย่าง: 2,000 ตร.ม.
= 1 ไร่ 1 งาน 25 ตร.วา
```

```javascript
function sqmToThaiArea(sqm) {
  const rai   = Math.floor(sqm / 1600);
  const ngan  = Math.floor((sqm % 1600) / 400);
  const waSq  = Math.floor((sqm % 400) / 4);
  return `${rai} ไร่ ${ngan} งาน ${waSq} ตร.วา`;
}
```

---

## 🔢 ข้อมูล Pre-loaded (สำหรับ Demo — ข้อ 5)

เพิ่มแปลงตัวอย่าง 4 แปลงใน localStorage ตอน init:

| แปลง | พิกัดศูนย์กลาง | พื้นที่ |
|------|----------------|---------|
| แปลง A - นาข้าว | 13.756, 100.501 | ~3 ไร่ |
| แปลง B - สวนผลไม้ | 13.760, 100.505 | ~5 ไร่ |
| แปลง C - ที่ดินเปล่า | 13.752, 100.498 | ~2 ไร่ |
| แปลง D - โรงเรือน | 13.758, 100.510 | ~1 ไร่ |

---

## 🚀 GitHub Setup

```bash
# 1. สร้าง repo ใหม่บน GitHub (public)
# ชื่อแนะนำ: map-parcel-manager

# 2. Push code
git init
git add .
git commit -m "feat: initial map parcel manager"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/map-parcel-manager.git
git push -u origin main

# 3. Invite collaborator
# GitHub → Settings → Collaborators → Add: supawat@erawangroup.com
```

---

## ✅ Checklist ก่อนส่ง

- [ ] วาดแปลงได้ (polygon 4+ จุด)
- [ ] คำนวณพื้นที่แสดงเป็น ไร่/งาน/ตร.วา
- [ ] มี snapshot รูปของแต่ละแปลง
- [ ] กรอกรายละเอียดแปลงได้
- [ ] มีแปลงอย่างน้อย 4 แปลง (pre-loaded หรือวาดเอง)
- [ ] แสดงรายการแปลงทั้งหมด
- [ ] มีฟีเจอร์เพิ่มเติม (เช่น export, ลบ, แก้ไข)
- [ ] Push ขึ้น GitHub
- [ ] Invite `supawat@erawangroup.com`

---

## ⏱️ เวลาประมาณ

| งาน | เวลา |
|-----|------|
| HTML structure + CSS | 15 นาที |
| Leaflet map + draw | 15 นาที |
| คำนวณพื้นที่ + modal | 20 นาที |
| Screenshot + localStorage | 15 นาที |
| Sidebar list + render | 15 นาที |
| ฟีเจอร์เพิ่มเติม | 20 นาที |
| GitHub + README | 10 นาที |
| **รวม** | **~2 ชั่วโมง** |
