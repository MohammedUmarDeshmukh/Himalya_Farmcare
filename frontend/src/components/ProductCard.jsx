import { useState } from 'react';
import { getProductImageUrl, money } from '../utils/formatters';
import { mlPerAcre } from '../utils/recommendation';

export default function ProductCard({ product, acres, greyed, onAdd, onShow }) {
  const availableSizes = product.availableSizes?.length ? product.availableSizes : [100, 500];
  const [size, setSize] = useState(availableSizes[0]);
  const dose = mlPerAcre(product.problem);
  const tag = product.problem === 'Insecticide' ? 'red' : product.problem === 'Fungicide' ? 'yellow' : product.problem === 'PGR' ? 'green' : '';
  return <article className={`card${greyed ? ' greyed' : ''}`}><div className="cardTop"><div className="thumb"><img src={getProductImageUrl(product)} alt={product.name} onError={(event) => { event.currentTarget.src = '/products/res.jpg'; }} /></div><div className="card-content"><h3>{product.name}</h3><div className="sub">{product.crop} • {product.method} • Seq: {product.seq}</div><div className="tags"><span className={`tag ${tag}`}>{product.problem}</span><span className="tag">100ml: {money(product.p100)}</span><span className="tag">500ml: {money(product.p500)}</span></div><div className="doseInfo">{acres > 0 ? <>Required dosage: <b>{dose * acres} ml</b> for <b>{acres} Acre</b> (standard {dose} ml/Acre)</> : <>Standard dosage: <b>{dose} ml</b> per Acre</>}</div></div></div><div className="cardBottom"><div className="prices"><div><b>{product.name}</b></div><div>{product.crop} • {product.problem}</div></div><div className="actions"><select className="miniSel" aria-label={`${product.name} bottle size`} value={size} onChange={(event) => setSize(Number(event.target.value))}>{availableSizes.map((availableSize) => <option key={availableSize} value={availableSize}>{availableSize} ml</option>)}</select><button type="button" className="btn2 btnAdd" onClick={() => onAdd(product.id, size)}>Add</button><button type="button" className="btn2" onClick={() => onShow(product)}>Show</button></div></div></article>;
}
