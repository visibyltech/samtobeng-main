import React, { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useMotionValue, useSpring, useTransform } from 'motion/react';
import { Laptop } from 'lucide-react';
import { getOptimizedImageUrl } from '../lib/cloudinary';
import { computeDiscountPercent, formatNaira, getStockSignal } from '../lib/format';
import { Product } from '../types';

export function StockSignalBars({ stock }: { stock: number }) {
  const { bars, label } = getStockSignal(stock);
  return (
    <div className="flex items-center gap-2">
      <span className={`signal-bars ${bars > 0 ? `active-${bars}` : ''}`}>
        <span />
        <span />
        <span />
        <span />
      </span>
      <span className="text-xs font-data text-steel">{label}</span>
    </div>
  );
}

export function ProductCard({ product }: { product: Product }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [imgError, setImgError] = useState(false);

  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.5);
  const rotateX = useSpring(useTransform(mouseY, [0, 1], [6, -6]), { stiffness: 300, damping: 25 });
  const rotateY = useSpring(useTransform(mouseX, [0, 1], [-6, 6]), { stiffness: 300, damping: 25 });
  const liftY = useSpring(0, { stiffness: 300, damping: 22 });

  const discount = computeDiscountPercent(product.price, product.oldPrice);
  const mainImage = getOptimizedImageUrl(product.images?.[0], 640);

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;
    mouseX.set((e.clientX - rect.left) / rect.width);
    mouseY.set((e.clientY - rect.top) / rect.height);
  }

  function handleMouseEnter() {
    liftY.set(-6);
  }

  function handleMouseLeave() {
    mouseX.set(0.5);
    mouseY.set(0.5);
    liftY.set(0);
  }

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{ rotateX, rotateY, y: liftY, transformPerspective: 800 }}
      className="h-full"
    >
      <Link
        to={`/products/${product.slug}`}
        className="group flex flex-col h-full rounded-2xl border border-line bg-white overflow-hidden hover:border-signal/40 transition-colors relative"
        style={{ boxShadow: '0 1px 2px rgba(11,11,12,0.04)' }}
      >
        <div
          className="absolute inset-0 rounded-2xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10"
          style={{ boxShadow: '0 20px 40px -12px rgba(11,11,12,0.15)' }}
        />

        <div className="relative aspect-square bg-[#F5F4F0] overflow-hidden">
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            whileHover={{ scale: 1.08 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          >
            {mainImage && !imgError ? (
              <img
                src={mainImage}
                alt={product.name}
                loading="lazy"
                referrerPolicy="no-referrer"
                onError={() => setImgError(true)}
                className="w-full h-full object-contain p-6"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center p-4 text-steel/60">
                <Laptop size={36} strokeWidth={1.5} />
                <span className="text-[11px] font-data mt-2 text-center line-clamp-2">
                  {product.name}
                </span>
              </div>
            )}
          </motion.div>

          <span className="absolute top-3 left-3 text-[10px] font-data uppercase tracking-wider bg-ink text-white px-2 py-1 rounded-full">
            {product.condition === 'new' ? 'Brand New' : 'UK Used'}
          </span>

          {discount !== null && (
            <motion.span
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.15, type: 'spring', stiffness: 400 }}
              className="absolute top-3 right-3 text-[10px] font-data uppercase tracking-wider bg-signal text-white px-2 py-1 rounded-full"
            >
              -{discount}%
            </motion.span>
          )}
        </div>

        <div className="p-4 flex flex-col gap-2 flex-1">
          <span className="text-xs uppercase tracking-wider text-steel font-data">
            {product.brand}
          </span>
          <h3 className="font-display font-semibold text-sm leading-snug line-clamp-2 group-hover:text-signal transition-colors">
            {product.name}
          </h3>
          <div className="mt-auto flex items-baseline gap-2 pt-1">
            <span className="font-data font-semibold text-ink">
              {formatNaira(product.price)}
            </span>
            {product.oldPrice && product.oldPrice > product.price && (
              <span className="font-data text-xs text-steel line-through">
                {formatNaira(product.oldPrice)}
              </span>
            )}
          </div>
          <StockSignalBars stock={product.stock} />
        </div>
      </Link>
    </motion.div>
  );
}
