// สถานะแอปพลิเคชัน
let currentParcelLayer = null;
let currentGeoJSON = null;
let customUploadedImageBase64 = null;

// ==========================================
// Step 2: Init Map + Draw Control
// ==========================================
// สร้างแผนที่ (ซูมไปที่กรุงเทพฯ)
const map = L.map('map').setView([13.7563, 100.5018], 13);

// ใส่ Base Map จาก OpenStreetMap (ฟรี)
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

// สร้าง FeatureGroup ไว้เก็บข้อมูลที่ถูกวาด
const drawnItems = new L.FeatureGroup().addTo(map);

// สร้างเครื่องมือวาด (Draw Control) - เปิดให้วาดแค่ Polygon ตาม requirement
const drawControl = new L.Control.Draw({
  draw: {
    polygon: {
      allowIntersection: false,
      drawError: { color: '#ef4444', message: '<strong>ห้ามเส้นตัดกัน!</strong>' },
      shapeOptions: { color: '#2563eb' }
    },
    rectangle: false,
    circle: false,
    circlemarker: false,
    marker: false,
    polyline: false
  },
  edit: {
    featureGroup: drawnItems,
    remove: true
  }
});
map.addControl(drawControl);

// ==========================================
// การจัดการ UI ทั่วไป
// ==========================================
const modal = document.getElementById('parcel-modal');
const closeModalBtn = document.getElementById('close-modal');
const cancelModalBtn = document.getElementById('cancel-modal');

closeModalBtn.addEventListener('click', closeModal);
cancelModalBtn.addEventListener('click', closeModal);

function closeModal() {
  modal.classList.add('hidden');
  
  // ถ้ายกเลิกโดยที่ยังไม่เซฟ ให้ลบ layer ที่เพิ่งวาดทิ้ง
  if (currentParcelLayer && !drawnItems.hasLayer(currentParcelLayer)) {
      map.removeLayer(currentParcelLayer);
  }
  
  // reset ตัวแปรและฟอร์ม
  currentParcelLayer = null;
  currentGeoJSON = null;
  customUploadedImageBase64 = null;
  document.getElementById('parcel-form').reset();
  
  const previewContainer = document.getElementById('image-preview-container');
  if (previewContainer) {
    previewContainer.style.display = 'none';
    document.getElementById('image-preview').src = '';
  }
}

// ==========================================
// การจัดการอัปโหลดรูปภาพเพิ่มเติม
// ==========================================
const imageUploadInput = document.getElementById('parcel-image-upload');
const imagePreviewContainer = document.getElementById('image-preview-container');
const imagePreview = document.getElementById('image-preview');
const removeImageBtn = document.getElementById('remove-image-btn');

if (imageUploadInput) {
  imageUploadInput.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = function(event) {
        customUploadedImageBase64 = event.target.result;
        imagePreview.src = customUploadedImageBase64;
        imagePreviewContainer.style.display = 'block';
      };
      reader.readAsDataURL(file);
    }
  });

  removeImageBtn.addEventListener('click', function() {
    customUploadedImageBase64 = null;
    imageUploadInput.value = '';
    imagePreview.src = '';
    imagePreviewContainer.style.display = 'none';
  });
}

// ==========================================
// Step 3: คำนวณพื้นที่
// ==========================================
// สูตรแปลงตารางเมตร เป็น ไร่ งาน ตารางวา
function sqmToThaiArea(sqm) {
  const rai = Math.floor(sqm / 1600);
  const ngan = Math.floor((sqm % 1600) / 400);
  const waSq = Math.floor((sqm % 400) / 4);
  return `${rai} ไร่ ${ngan} งาน ${waSq} ตร.วา`;
}

let currentAreaSqM = 0;
let currentAreaRai = '';

map.on(L.Draw.Event.CREATED, function(e) {
  const layer = e.layer;
  currentParcelLayer = layer;
  currentGeoJSON = layer.toGeoJSON();
  
  // เพิ่มลงแผนที่ชั่วคราวเพื่อให้เห็นภาพ
  map.addLayer(currentParcelLayer);
  
  // คำนวณพื้นที่ด้วย Turf.js
  currentAreaSqM = turf.area(currentGeoJSON);
  currentAreaRai = sqmToThaiArea(currentAreaSqM);
  
  // แสดงข้อมูลใน Modal
  document.getElementById('area-rai').innerText = currentAreaRai;
  document.getElementById('area-sqm').innerText = `(${currentAreaSqM.toFixed(2)} ตร.ม.)`;
  
  // เปิด Modal
  modal.classList.remove('hidden');
});

// ==========================================
// Step 4 & 5: Save & LocalStorage & Render
// ==========================================
const parcelForm = document.getElementById('parcel-form');

parcelForm.addEventListener('submit', async function(e) {
  e.preventDefault();
  
  const name = document.getElementById('parcel-name').value;
  const owner = document.getElementById('parcel-owner').value;
  const note = document.getElementById('parcel-note').value;
  
  // เปลี่ยนปุ่มเป็นสถานะกำลังโหลด
  const submitBtn = parcelForm.querySelector('button[type="submit"]');
  const originalText = submitBtn.innerHTML;
  submitBtn.innerHTML = '⏳ กำลังบันทึก...';
  submitBtn.disabled = true;
  
  try {
    // ถ่ายภาพแผนที่ (แคปจาก container ของ map)
    const canvas = await html2canvas(document.getElementById('map'), {
      useCORS: true,
      ignoreElements: (element) => {
         // ไม่เอาพวกปุ่ม control ของ leaflet เข้าไปในรูป
         return element.classList.contains('leaflet-control-container');
      }
    });
    const imageBase64 = canvas.toDataURL('image/jpeg', 0.8);
    
    const parcelData = {
      id: Date.now().toString(),
      name,
      owner,
      note,
      areaSqM: currentAreaSqM,
      areaRai: currentAreaRai,
      geoJSON: currentGeoJSON,
      image: imageBase64,
      attachedImage: customUploadedImageBase64,
      createdAt: new Date().toISOString()
    };
    
    // บันทึกลง LocalStorage
    const parcels = JSON.parse(localStorage.getItem('parcels') || '[]');
    parcels.push(parcelData);
    localStorage.setItem('parcels', JSON.stringify(parcels));
    
    // ลบตัวชั่วคราวออก และยืนยันการวาดลงใน FeatureGroup หลัก
    map.removeLayer(currentParcelLayer);
    drawnItems.addLayer(currentParcelLayer);
    currentParcelLayer.parcelId = parcelData.id; // ผูก ID
    const popupHtml = `
      <div style="text-align: center; min-width: 180px;">
        <h4 style="margin: 0 0 5px 0; font-size: 14px;">${parcelData.name}</h4>
        <div style="color: var(--primary-color); font-weight: bold; margin-bottom: 8px;">${parcelData.areaRai}</div>
        ${parcelData.image ? `<img src="${parcelData.image}" style="width: 100%; height: 100px; object-fit: cover; border-radius: 4px; margin-bottom: 5px; border: 1px solid #ccc;">` : ''}
        ${parcelData.attachedImage ? `<div style="font-size: 11px; text-align: left; margin-bottom: 2px;">📸 รูปแนบเพิ่มเติม:</div><img src="${parcelData.attachedImage}" style="width: 100%; height: 100px; object-fit: cover; border-radius: 4px; border: 1px solid var(--primary-color);">` : ''}
      </div>
    `;
    currentParcelLayer.bindPopup(popupHtml);
    
    // ปิดและรีเฟรชหน้าจอ
    closeModal();
    renderParcelList();
    
  } catch (error) {
    console.error('Error saving parcel:', error);
    alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
  } finally {
    submitBtn.innerHTML = originalText;
    submitBtn.disabled = false;
  }
});

function renderParcelList() {
  const parcels = JSON.parse(localStorage.getItem('parcels') || '[]');
  const listContainer = document.getElementById('parcel-list');
  
  if (parcels.length === 0) {
    listContainer.innerHTML = `
      <div class="empty-state">
        <p>ยังไม่มีข้อมูลแปลงที่ดิน</p>
        <p class="sub-text">คลิกไอคอนรูปห้าเหลี่ยมบนแผนที่เพื่อเริ่มวาด</p>
      </div>
    `;
    return;
  }
  
  listContainer.innerHTML = '';
  
  parcels.forEach(parcel => {
    const card = document.createElement('div');
    card.className = 'parcel-card';
    card.innerHTML = `
      <div class="parcel-card-header">
        <div class="parcel-title">${parcel.name}</div>
        <div class="parcel-area">${parcel.areaRai}</div>
      </div>
      <img src="${parcel.image}" alt="Map snapshot" class="parcel-img">
      ${parcel.attachedImage ? `<div style="margin-top: -5px; margin-bottom: 5px; font-size: 0.8rem; font-weight: 500;">📸 รูปแนบ:</div><img src="${parcel.attachedImage}" alt="Attached Image" class="parcel-img" style="height: 100px; border: 2px solid var(--primary-color);">` : ''}
      <div class="parcel-meta">
        ${parcel.owner ? `👤 เจ้าของ: ${parcel.owner}<br>` : ''}
        📅 สร้างเมื่อ: ${new Date(parcel.createdAt).toLocaleDateString('th-TH')}
      </div>
      <div style="margin-top: 10px; display: flex; gap: 5px;">
        <button class="btn-secondary" style="flex:1; padding: 0.25rem; font-size: 0.8rem;" onclick="zoomToParcel('${parcel.id}')">🔍 ดู</button>
        <button class="btn-secondary" style="flex:1; padding: 0.25rem; font-size: 0.8rem; color: #ef4444; border-color: #ef4444;" onclick="deleteParcel('${parcel.id}')">🗑️ ลบ</button>
      </div>
    `;
    listContainer.appendChild(card);
  });
}

// ฟังก์ชันซูมไปที่แปลง
window.zoomToParcel = function(id) {
  // เลื่อนขึ้นไปที่แผนที่อัตโนมัติ (มีประโยชน์มากบนมือถือ)
  document.getElementById('map').scrollIntoView({ behavior: 'smooth', block: 'center' });

  let found = false;
  drawnItems.eachLayer(function(layer) {
    if (layer.parcelId === id) {
      map.fitBounds(layer.getBounds(), { padding: [50, 50], maxZoom: 16 });
      layer.openPopup();
      found = true;
    }
  });
  if (!found) {
     // กรณีเกิดบั๊ก layer หาย ให้รีโหลดข้อมูลจาก LocalStorage มาวาดใหม่ได้
     console.log("Layer not found on map, reloading might be needed.");
  }
};

// ฟังก์ชันลบแปลง
window.deleteParcel = function(id) {
  if (confirm('คุณแน่ใจหรือไม่ว่าต้องการลบแปลงนี้?')) {
    let parcels = JSON.parse(localStorage.getItem('parcels') || '[]');
    parcels = parcels.filter(p => p.id !== id);
    localStorage.setItem('parcels', JSON.stringify(parcels));
    
    // ลบออกจากแผนที่
    drawnItems.eachLayer(function(layer) {
      if (layer.parcelId === id) {
        drawnItems.removeLayer(layer);
      }
    });
    
    renderParcelList();
  }
};

// ==========================================
// Pre-load ข้อมูลตัวอย่าง 4 แปลง
// ==========================================
function initApp() {
  let parcels = JSON.parse(localStorage.getItem('parcels') || 'null');
  
  // บังคับอัปเดตรูปภาพสำหรับข้อมูลตัวอย่างเดิมที่ยังเป็นลิงก์เก่า
  if (parcels) {
    let updated = false;
    parcels.forEach(p => {
      if (p.image && p.image.includes('placehold.co')) {
        if (p.id === 'mock-1') p.image = './images/parcel-a.jpg';
        if (p.id === 'mock-2') p.image = './images/parcel-b.jpg';
        if (p.id === 'mock-3') p.image = './images/parcel-c.jpg';
        if (p.id === 'mock-4') p.image = './images/parcel-d.jpg';
        updated = true;
      }
    });
    if (updated) {
      localStorage.setItem('parcels', JSON.stringify(parcels));
    }
  }

  // ถ้ายังไม่เคยมีข้อมูลเลย ให้สร้าง mock data
  if (!parcels || parcels.length === 0) {
    parcels = [
      {
        id: 'mock-1', name: 'แปลง A - นาข้าว', owner: 'ลุงชม', note: 'ปลูกข้าวหอมมะลิ',
        areaSqM: 4800, areaRai: '3 ไร่ 0 งาน 0 ตร.วา',
        geoJSON: {"type":"Feature","properties":{},"geometry":{"type":"Polygon","coordinates":[[[100.501,13.756],[100.502,13.756],[100.502,13.757],[100.501,13.757],[100.501,13.756]]]}},
        image: './images/parcel-a.jpg',
        createdAt: new Date().toISOString()
      },
      {
        id: 'mock-2', name: 'แปลง B - สวนผลไม้', owner: 'ป้าศรี', note: 'ทุเรียน มังคุด',
        areaSqM: 8000, areaRai: '5 ไร่ 0 งาน 0 ตร.วา',
        geoJSON: {"type":"Feature","properties":{},"geometry":{"type":"Polygon","coordinates":[[[100.505,13.760],[100.506,13.760],[100.506,13.762],[100.504,13.761],[100.505,13.760]]]}},
        image: './images/parcel-b.jpg',
        createdAt: new Date().toISOString()
      },
      {
        id: 'mock-3', name: 'แปลง C - ที่ดินเปล่า', owner: 'เสี่ยชัย', note: 'รอการพัฒนา',
        areaSqM: 3200, areaRai: '2 ไร่ 0 งาน 0 ตร.วา',
        geoJSON: {"type":"Feature","properties":{},"geometry":{"type":"Polygon","coordinates":[[[100.498,13.752],[100.499,13.752],[100.499,13.754],[100.497,13.753],[100.498,13.752]]]}},
        image: './images/parcel-c.jpg',
        createdAt: new Date().toISOString()
      },
      {
        id: 'mock-4', name: 'แปลง D - โรงเรือน', owner: 'เฮียตง', note: 'ฟาร์มผักไฮโดรโปนิกส์',
        areaSqM: 1600, areaRai: '1 ไร่ 0 งาน 0 ตร.วา',
        geoJSON: {"type":"Feature","properties":{},"geometry":{"type":"Polygon","coordinates":[[[100.510,13.758],[100.511,13.758],[100.511,13.759],[100.510,13.759],[100.510,13.758]]]}},
        image: './images/parcel-d.jpg',
        createdAt: new Date().toISOString()
      }
    ];
    localStorage.setItem('parcels', JSON.stringify(parcels));
  }
  
  // วาดแปลงลงบนแผนที่
  parcels.forEach(p => {
    const layer = L.geoJSON(p.geoJSON, {
      style: { color: '#2563eb', weight: 3, fillOpacity: 0.2 }
    });
    
    layer.eachLayer(l => {
      l.parcelId = p.id;
      const popupHtml = `
        <div style="text-align: center; min-width: 180px;">
          <h4 style="margin: 0 0 5px 0; font-size: 14px;">${p.name}</h4>
          <div style="color: var(--primary-color); font-weight: bold; margin-bottom: 8px;">${p.areaRai}</div>
          ${p.image ? `<img src="${p.image}" style="width: 100%; height: 100px; object-fit: cover; border-radius: 4px; margin-bottom: 5px; border: 1px solid #ccc;">` : ''}
          ${p.attachedImage ? `<div style="font-size: 11px; text-align: left; margin-bottom: 2px;">📸 รูปแนบเพิ่มเติม:</div><img src="${p.attachedImage}" style="width: 100%; height: 100px; object-fit: cover; border-radius: 4px; border: 1px solid var(--primary-color);">` : ''}
        </div>
      `;
      l.bindPopup(popupHtml);
      drawnItems.addLayer(l);
    });
  });
  
  // ซูมให้เห็นทุกแปลงครั้งแรก
  if (parcels.length > 0 && drawnItems.getLayers().length > 0) {
    map.fitBounds(drawnItems.getBounds(), { padding: [50, 50] });
  }
  
  renderParcelList();
}

// เริ่มต้นแอปพลิเคชัน
initApp();
