# Map Parcel Manager 🗺️

A web-based tool for managing land parcels using interactive maps. This application allows users to draw, measure, and document land information with visual snapshots and custom attachments.

## 🚀 Features

- **Interactive Drawing**: Use Leaflet.draw to define land boundaries on a map.
- **Area Calculation**: Automatic area measurement in Thai units (Rai, Ngan, Sq. Wah) and Square Meters using Turf.js.
- **Parcel Documentation**: Save owner details, notes, and attach additional images/deeds.
- **Visual Snapshots**: Automatic map snapshot generation for each parcel using html2canvas.
- **Mobile Responsive**: Fully optimized for use on smartphones and tablets.
- **Local Persistence**: Data is saved locally in the browser's localStorage.

## 🛠️ Tech Stack

- **Frontend**: Vanilla JavaScript (ES6+), HTML5, CSS3.
- **Mapping Library**: [Leaflet.js](https://leafletjs.com/)
- **GIS Operations**: [Turf.js](https://turfjs.org/)
- **Visualizations**: [html2canvas](https://html2canvas.hertzen.com/)
- **Fonts**: Google Fonts (Inter)

## 📦 Getting Started

1. Clone this repository:
   ```bash
   git clone https://github.com/nthkmbm43/map-parcel-manager.git
   ```
2. Open `index.html` in your browser (Recommended: use a local server like `npx serve .` for full feature support).

## 📄 License

This project is open-source and available under the MIT License.
