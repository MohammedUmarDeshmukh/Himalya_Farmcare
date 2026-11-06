import { sortCropNames } from '../utils/cropOrder';

export default function CropCategories({ crops }) {
  const sortedCrops = sortCropNames(crops || []);

  return (
    <div className="crop-grid">
      {sortedCrops.map((crop, index) => (
        <article className="crop-card" key={crop}>
          <span className="crop-number">{String(index + 1).padStart(2, '0')}</span>
          <span className="crop-icon" aria-hidden="true">♧</span>
          <h3>{crop}</h3>
          <p>Select this crop to view the products currently available in the catalogue.</p>
        </article>
      ))}
    </div>
  );
}
